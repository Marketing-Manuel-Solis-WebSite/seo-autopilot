import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSearchAnalytics, getDateRange, isGSCConfigured, type GSCRow } from '@/lib/gsc/client'
import { protectRankings, type RankingChange } from '@/lib/monitoring/rank-protector'
import { triggerAlert } from '@/lib/monitoring/alert-engine'
import { claudeSonnetFixSuggestion } from '@/lib/claude/sonnet'
import { analyzeSnippetOpportunity } from '@/lib/seo/featured-snippets'
import type { SemrushKeywordData } from '@/types/seo'
import pLimit from 'p-limit'

const CONCURRENT_SITES = 5
const MAX_FIX_SUGGESTIONS_PER_SITE = 5

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sites = await prisma.site.findMany({
    where: { isActive: true },
    select: { id: true, domain: true, name: true, targetCountry: true, gscPropertyUrl: true, gscCredentials: true },
  })

  const limit = pLimit(CONCURRENT_SITES)

  const results = await Promise.allSettled(
    sites.map(site => limit(() => processSite(site)))
  )

  const summary = results.map((r, i) => ({
    siteId: sites[i].id,
    domain: sites[i].domain,
    status: r.status,
    data: r.status === 'fulfilled' ? r.value : (r.reason as Error)?.message,
  }))

  const rejected = results.filter(r => r.status === 'rejected')
  if (rejected.length > 0) {
    await triggerAlert({
      siteId: sites[0]?.id ?? 'system',
      alertType: 'cron_failure',
      severity: rejected.length === sites.length ? 'critical' : 'warning',
      title: `rank-check: ${rejected.length}/${sites.length} sites failed`,
      message: summary.filter(s => s.status === 'rejected').map(s => `${s.domain}: ${s.data}`).join('\n'),
    })
  }

  return NextResponse.json({ timestamp: new Date().toISOString(), results: summary })
}

function gscRowsToKeywordData(rows: GSCRow[]): SemrushKeywordData[] {
  return rows.map(row => ({
    keyword: row.keys?.[0] ?? '',
    position: Math.round(row.position ?? 0),
    searchVolume: row.impressions ?? 0,
    cpc: 0,
    url: row.keys?.[1] ?? '',
    traffic: row.clicks ?? 0,
    trafficCost: 0,
    competition: 0,
    trends: '',
  }))
}

async function processSite(site: { id: string; domain: string; name: string; targetCountry: string; gscPropertyUrl: string | null; gscCredentials: unknown }) {
  let rankings: SemrushKeywordData[] = []

  if (isGSCConfigured(site)) {
    const currentRows = await getSearchAnalytics(site.id, {
      ...getDateRange(7),
      dimensions: ['query', 'page'],
      rowLimit: 500,
    })
    rankings = gscRowsToKeywordData(currentRows)
  }

  const changes = await protectRankings(site.id, rankings)
  const significantDrops = changes.filter(c => c.change < -3)

  if (significantDrops.length > 0) {
    await triggerAlert({
      siteId: site.id,
      alertType: 'ranking_drop',
      severity: significantDrops.some(d => d.change < -5) ? 'critical' : 'warning',
      title: `${significantDrops.length} keywords cayeron en ${site.domain}`,
      message: significantDrops.map(d => `${d.keyword}: ${d.previousPosition} → ${d.currentPosition} (${d.change})`).join('\n'),
      data: { drops: significantDrops },
    })

    const topDrops = significantDrops.sort((a, b) => a.change - b.change).slice(0, MAX_FIX_SUGGESTIONS_PER_SITE)
    const fixSuggestions = []

    for (const drop of topDrops) {
      try {
        const suggestion = await claudeSonnetFixSuggestion({
          issue: `Keyword "${drop.keyword}" dropped ${Math.abs(drop.change)} positions (from #${drop.previousPosition} to #${drop.currentPosition})`,
          siteContext: { domain: site.domain, name: site.name, url: drop.url },
          currentValue: `Position ${drop.currentPosition} for "${drop.keyword}"`,
        })

        await prisma.fix.create({
          data: {
            siteId: site.id,
            fixType: 'ranking_recovery',
            priority: drop.change < -5 ? 'critical' : 'high',
            title: `Recover ranking: ${drop.keyword} dropped ${Math.abs(drop.change)} positions`,
            description: suggestion.explanation,
            affectedUrl: drop.url,
            beforeValue: `Position ${drop.previousPosition}`,
            afterValue: suggestion.proposedValue,
            implementation: suggestion as never,
            isDestructive: false,
            status: 'pending_approval',
          },
        })

        fixSuggestions.push({ keyword: drop.keyword, drop: drop.change, fix: suggestion.fixTitle, impact: suggestion.estimatedImpact })
      } catch (err) {
        console.error(`Fix suggestion failed for "${drop.keyword}" on ${site.domain}:`, err)
      }
    }

    if (fixSuggestions.length > 0) {
      await triggerAlert({
        siteId: site.id,
        alertType: 'ranking_recovery_plan',
        severity: 'info',
        title: `${fixSuggestions.length} recovery fixes generated for ${site.domain}`,
        message: fixSuggestions.map(f => `${f.keyword} (${f.drop}): ${f.fix}`).join('\n'),
        data: { fixes: fixSuggestions },
      })
    }
  }

  // Snippet optimization for stable keywords in positions 2-10
  let snippetFixesCreated = 0
  try {
    const stableInTop10 = await prisma.ranking.findMany({
      where: { siteId: site.id, position: { gte: 2, lte: 10 }, change: 0 },
      orderBy: { checkedAt: 'desc' },
      distinct: ['keywordText'],
      take: 5,
    })

    for (const ranking of stableInTop10) {
      try {
        const opp = await analyzeSnippetOpportunity(ranking.keywordText, ranking.position, site.id)
        if (opp?.exists && opp.format !== 'none') {
          await prisma.fix.create({
            data: {
              siteId: site.id,
              fixType: 'snippet_optimization',
              priority: opp.estimatedImpact === 'high' ? 'high' : 'medium',
              title: `Snippet opportunity: "${ranking.keywordText}" (pos #${ranking.position}, ${opp.format} format)`,
              description: opp.recommendedStructure,
              affectedUrl: ranking.url,
              implementation: opp as never,
              isDestructive: false,
              status: 'pending_approval',
            },
          })
          snippetFixesCreated++
        }
      } catch { /* skip individual failures */ }
    }
  } catch (err) {
    console.error(`Snippet analysis failed for ${site.domain}:`, err)
  }

  await prisma.monitoringLog.create({
    data: {
      siteId: site.id,
      runType: 'rank_check',
      model: 'gsc',
      status: 'success',
      summary: { totalChanges: changes.length, drops: significantDrops.length, snippetFixes: snippetFixesCreated } as never,
    },
  })

  return { changes: changes.length, drops: significantDrops.length, snippetFixes: snippetFixesCreated }
}
