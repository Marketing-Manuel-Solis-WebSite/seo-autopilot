import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSearchAnalytics, getDateRange, isGSCConfigured, type GSCRow } from '@/lib/gsc/client'
import { getCompetitorDomains } from '@/lib/dataforseo/client'
import { claudeOpusDeepAnalysis } from '@/lib/claude/opus'
import { buildTopicMap } from '@/lib/seo/topical-authority'
import { triggerAlert } from '@/lib/monitoring/alert-engine'
import { generateMetaVariants, analyzeVariantPerformance } from '@/lib/seo/ctr-optimizer'
import { auditNAPConsistency, generateLocationSchema } from '@/lib/seo/local-seo'
import pLimit from 'p-limit'

const MAX_CONCURRENT_SITES = 3

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sites = await prisma.site.findMany({ where: { isActive: true } })
  const limit = pLimit(MAX_CONCURRENT_SITES)

  const results = await Promise.allSettled(
    sites.map(site => limit(() => processSite(site)))
  )

  const summary = results.map((r, i) => ({
    domain: sites[i].domain,
    status: r.status,
    error: r.status === 'rejected' ? String(r.reason) : undefined,
  }))

  const rejected = results.filter(r => r.status === 'rejected')
  if (rejected.length > 0) {
    await triggerAlert({
      siteId: sites[0]?.id ?? 'system',
      alertType: 'cron_failure',
      severity: rejected.length === sites.length ? 'critical' : 'warning',
      title: `deep-audit: ${rejected.length}/${sites.length} sites failed`,
      message: summary.filter(s => s.error).map(s => `${s.domain}: ${s.error}`).join('\n'),
    })
  }

  return NextResponse.json({
    status: 'complete',
    sitesProcessed: sites.length,
    concurrencyLimit: MAX_CONCURRENT_SITES,
    results: summary,
    timestamp: new Date().toISOString(),
  })
}

async function processSite(site: { id: string; domain: string; name: string; targetCountry: string; gscPropertyUrl: string | null; gscCredentials: unknown }) {
  try {
    // Fetch data from GSC + DataForSEO
    let auditData: GSCRow[] = []
    let rankingsData: GSCRow[] = []

    if (isGSCConfigured(site)) {
      [auditData, rankingsData] = await Promise.all([
        getSearchAnalytics(site.id, { ...getDateRange(90), dimensions: ['query', 'page'], rowLimit: 1000 }),
        getSearchAnalytics(site.id, { ...getDateRange(28), dimensions: ['query', 'page'], rowLimit: 500 }),
      ])
    }

    const competitors = await getCompetitorDomains(site.domain, site.targetCountry)

    const rankingHistory = await prisma.ranking.findMany({
      where: {
        siteId: site.id,
        checkedAt: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { checkedAt: 'desc' },
      take: 1000,
    })

    const analysis = await claudeOpusDeepAnalysis({
      siteData: { domain: site.domain, name: site.name },
      auditData,
      rankingHistory,
      competitors,
      instruction: `
        Genera el plan SEO completo para esta semana.
        Identifica las 5 oportunidades de mayor impacto.
        Crea un plan de contenido para los próximos 30 días.
        Detecta cualquier riesgo de penalización.
        Prioriza: proteger rankings actuales > crecer en nuevas keywords > nuevo contenido.
      `,
    })

    await prisma.audit.create({
      data: {
        siteId: site.id,
        auditType: 'full',
        status: 'complete',
        score: analysis.seoHealthScore,
        criticalIssues: analysis.criticalIssues as never,
        opportunities: analysis.contentOpportunities as never,
        claudeAnalysis: analysis as never,
        model: 'claude-opus',
      },
    })

    for (const fix of analysis.technicalFixes ?? []) {
      await prisma.fix.create({
        data: {
          siteId: site.id,
          fixType: 'technical',
          priority: fix.priority ?? 'medium',
          title: fix.issue,
          description: fix.fix,
          isDestructive: fix.isDestructive ?? false,
          implementation: fix as never,
          status: 'pending_approval',
        },
      })
    }

    for (const contentItem of analysis.monthlyContentPlan ?? []) {
      await prisma.content.create({
        data: {
          siteId: site.id,
          contentType: contentItem.contentType ?? 'blog',
          title: contentItem.title,
          targetKeyword: contentItem.keyword,
          body: '',
          status: 'draft',
          generatedBy: 'claude-opus',
        },
      })
    }

    try { await buildTopicMap(site.id) } catch (err) { console.error(`Topic map failed for ${site.domain}:`, err) }

    // CTR Optimizer — GSC integration
    try {
      if (isGSCConfigured(site)) {
        const ctrRows = rankingsData.length > 0 ? rankingsData : auditData
        const activeVariants = await prisma.metaVariant.findMany({ where: { siteId: site.id, status: 'testing' } })

        for (const variant of activeVariants) {
          const matching = ctrRows.filter(d => d.keys?.[1] === variant.url && d.keys?.[0] === variant.keyword)
          if (matching.length > 0) {
            const totalImpressions = matching.reduce((s, d) => s + (d.impressions ?? 0), 0)
            const totalClicks = matching.reduce((s, d) => s + (d.clicks ?? 0), 0)
            await prisma.metaVariant.update({
              where: { id: variant.id },
              data: {
                impressionsA: variant.impressionsA + Math.floor(totalImpressions / 2),
                clicksA: variant.clicksA + Math.floor(totalClicks / 2),
                impressionsB: variant.impressionsB + Math.ceil(totalImpressions / 2),
                clicksB: variant.clicksB + Math.ceil(totalClicks / 2),
              },
            })
          }
          await analyzeVariantPerformance(variant)
        }

        const lowCTRPages = ctrRows
          .filter(d => (d.ctr ?? 0) < 0.03 && (d.impressions ?? 0) >= 50)
          .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
          .slice(0, 10)

        for (const page of lowCTRPages) {
          const existing = await prisma.metaVariant.findFirst({
            where: { siteId: site.id, url: page.keys?.[1] ?? '', keyword: page.keys?.[0] ?? '', status: 'testing' },
          })
          if (existing) continue
          const content = await prisma.content.findFirst({
            where: { siteId: site.id, publishedUrl: page.keys?.[1] ?? '', status: 'published' },
          })
          if (content) await generateMetaVariants(content, page.ctr ?? 0)
        }
      }
    } catch (err) { console.error(`CTR optimizer failed for ${site.domain}:`, err) }

    // Local SEO
    try {
      const locations = await prisma.location.findMany({ where: { siteId: site.id, isActive: true } })
      if (locations.length > 0) {
        const inconsistencies = await auditNAPConsistency(site.id, locations)
        for (const issue of inconsistencies) {
          await prisma.fix.create({
            data: { siteId: site.id, fixType: 'nap_inconsistency', priority: 'high', title: `NAP inconsistency: ${issue.locationName} — ${issue.field}`, description: issue.issue, isDestructive: false, status: 'pending_approval' },
          })
        }
        for (const location of locations) {
          const schema = generateLocationSchema(location)
          const locationContent = await prisma.content.findFirst({
            where: { siteId: site.id, contentType: 'location_page', title: { contains: location.city }, status: 'published' },
          })
          if (!locationContent) {
            await prisma.fix.create({
              data: { siteId: site.id, fixType: 'missing_local_schema', priority: 'medium', title: `Missing location page: ${location.name}`, description: `No published location page found for ${location.city}, ${location.state}.`, afterValue: schema, isDestructive: false, status: 'pending_approval' },
            })
          }
        }
      }
    } catch (err) { console.error(`Local SEO audit failed for ${site.domain}:`, err) }

    await prisma.monitoringLog.create({
      data: { siteId: site.id, runType: 'deep_audit', model: 'claude-opus', status: 'success', summary: { score: analysis.seoHealthScore, issues: analysis.criticalIssues?.length } as never },
    })
  } catch (error) {
    console.error(`Deep audit failed for ${site.domain}:`, error)
    await prisma.monitoringLog.create({
      data: { siteId: site.id, runType: 'deep_audit', model: 'claude-opus', status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
    })
    throw error
  }
}
