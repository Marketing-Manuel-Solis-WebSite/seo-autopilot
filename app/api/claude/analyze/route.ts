import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { claudeOpusDeepAnalysis } from '@/lib/claude/opus'
import { getSearchAnalytics, getDateRange, isGSCConfigured } from '@/lib/gsc/client'
import { getCompetitorDomains } from '@/lib/dataforseo/client'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId } = await request.json()

  const site = await prisma.site.findUniqueOrThrow({ where: { id: siteId } })

  let auditData: unknown = []
  let rankings: unknown = []
  if (isGSCConfigured(site)) {
    [auditData, rankings] = await Promise.all([
      getSearchAnalytics(siteId, { ...getDateRange(90), dimensions: ['query', 'page'], rowLimit: 1000 }),
      getSearchAnalytics(siteId, { ...getDateRange(28), dimensions: ['query', 'page'], rowLimit: 500 }),
    ])
  }

  const competitors = await getCompetitorDomains(site.domain, site.targetCountry)

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
    instruction: `Análisis profundo completo de ${site.domain}. Genera recomendaciones accionables priorizadas.`,
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
}
