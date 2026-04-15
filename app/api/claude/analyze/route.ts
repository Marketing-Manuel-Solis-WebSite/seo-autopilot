import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { claudeOpusDeepAnalysis } from '@/lib/claude/opus'
import { getSearchAnalytics, getDateRange, isGSCConfigured } from '@/lib/gsc/client'
import { getCompetitorDomains } from '@/lib/dataforseo/client'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { siteId } = await request.json()

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    }

    const site = await prisma.site.findUnique({ where: { id: siteId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    let auditData: unknown = []
    let rankings: unknown = []
    if (isGSCConfigured(site)) {
      try {
        [auditData, rankings] = await Promise.all([
          getSearchAnalytics(siteId, { ...getDateRange(90), dimensions: ['query', 'page'], rowLimit: 1000 }),
          getSearchAnalytics(siteId, { ...getDateRange(28), dimensions: ['query', 'page'], rowLimit: 500 }),
        ])
      } catch (gscErr) {
        console.error(`[Claude Analyze] GSC fetch failed for ${site.domain}:`, gscErr)
      }
    }

    let competitors: unknown = []
    try {
      competitors = await getCompetitorDomains(site.domain, site.targetCountry)
    } catch (compErr) {
      console.error(`[Claude Analyze] Competitor fetch failed for ${site.domain}:`, compErr)
    }

    const rankingHistory = await prisma.ranking.findMany({
      where: {
        siteId,
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
      instruction: `Analisis profundo completo de ${site.domain}. Genera recomendaciones accionables priorizadas.`,
    })

    await prisma.audit.create({
      data: {
        siteId,
        auditType: 'full',
        status: 'complete',
        score: analysis.seoHealthScore,
        criticalIssues: analysis.criticalIssues as never,
        opportunities: analysis.contentOpportunities as never,
        claudeAnalysis: analysis as never,
        model: 'claude-opus',
      },
    })

    return NextResponse.json(analysis)
  } catch (err) {
    console.error('[Claude Analyze]', err)
    return NextResponse.json(
      { error: 'Error running analysis', detail: (err as Error).message },
      { status: 500 },
    )
  }
}
