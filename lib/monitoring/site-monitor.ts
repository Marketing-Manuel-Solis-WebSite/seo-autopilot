import { getSearchAnalytics, getDateRange, isGSCConfigured, type GSCRow } from '@/lib/gsc/client'
import { claudeSonnetMonitor } from '@/lib/claude/sonnet'
import { prisma } from '@/lib/prisma'
import { triggerAlert } from './alert-engine'
import { detectOpportunities } from './opportunity-detector'
import { protectRankings, type RankingChange } from './rank-protector'
import type { SemrushKeywordData } from '@/types/seo'

export interface MonitorResult {
  siteId: string
  status: 'ok' | 'warning' | 'critical'
  issues: string[]
  opportunities: string[]
  rankingChanges: RankingChange[]
  actionsQueued: number
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

export async function runHourlyMonitor(siteId: string): Promise<MonitorResult> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) throw new Error(`Site not found: ${siteId}`)
  const startTime = Date.now()

  let gscRows: GSCRow[] = []
  if (isGSCConfigured(site)) {
    try {
      const dateRange = getDateRange(28)
      gscRows = await getSearchAnalytics(siteId, {
        ...dateRange,
        dimensions: ['query', 'page'],
        rowLimit: 200,
      })
    } catch (err) {
      console.error(`GSC fetch failed for ${site.domain}:`, err)
    }
  }

  const rankings = gscRowsToKeywordData(gscRows)
  const auditSnapshot = {
    domain: site.domain,
    totalKeywords: gscRows.length,
    totalClicks: gscRows.reduce((s, r) => s + (r.clicks ?? 0), 0),
    totalImpressions: gscRows.reduce((s, r) => s + (r.impressions ?? 0), 0),
    avgPosition: gscRows.length > 0 ? gscRows.reduce((s, r) => s + (r.position ?? 0), 0) / gscRows.length : 0,
    avgCTR: gscRows.length > 0 ? gscRows.reduce((s, r) => s + (r.ctr ?? 0), 0) / gscRows.length : 0,
  }

  const rankingChanges = await protectRankings(siteId, rankings)

  const claudeAnalysis = await claudeSonnetMonitor({
    site: { id: siteId, domain: site.domain, name: site.name },
    auditSnapshot,
    rankingChanges,
    instruction: `
      Analiza este snapshot SEO de ${site.domain}.
      PRIORIDAD MÁXIMA: detectar cualquier señal de decremento en rankings o tráfico.
      Si detectas caídas de posición en keywords importantes, marca como CRÍTICO.
      Identifica también oportunidades rápidas de mejora.
      Responde en JSON con campos: status, issues, opportunities, rankingAlerts, recommendedActions.
    `,
  })

  const opportunities = await detectOpportunities(siteId, auditSnapshot, claudeAnalysis)

  if (claudeAnalysis.status === 'critical' || rankingChanges.some(r => r.change < -3)) {
    await triggerAlert({
      siteId,
      alertType: 'ranking_drop',
      severity: 'critical',
      title: `Caída de rankings detectada en ${site.domain}`,
      message: claudeAnalysis.rankingAlerts?.join('\n') ?? '',
      data: { rankingChanges, claudeAnalysis },
    })
  }

  if (claudeAnalysis.status === 'warning') {
    await triggerAlert({
      siteId,
      alertType: 'audit_error',
      severity: 'warning',
      title: `Warnings detectados en ${site.domain}`,
      message: claudeAnalysis.issues?.join('\n') ?? '',
      data: { claudeAnalysis },
    })
  }

  await prisma.monitoringLog.create({
    data: {
      siteId,
      runType: 'hourly_monitor',
      model: 'claude-sonnet',
      durationMs: Date.now() - startTime,
      status: 'success',
      summary: claudeAnalysis as never,
    },
  })

  return {
    siteId,
    status: claudeAnalysis.status,
    issues: claudeAnalysis.issues ?? [],
    opportunities: opportunities.map(o => o.title),
    rankingChanges,
    actionsQueued: claudeAnalysis.recommendedActions?.length ?? 0,
  }
}
