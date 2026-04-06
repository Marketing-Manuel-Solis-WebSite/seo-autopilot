import { prisma } from '@/lib/prisma'
import type { MonitorResult } from '@/lib/claude/types'

export interface SEOOpportunity {
  type: 'quick_win' | 'content_gap' | 'technical_fix' | 'backlink'
  title: string
  description: string
  estimatedImpact: 'high' | 'medium' | 'low'
  keyword?: string
  url?: string
}

export async function detectOpportunities(
  siteId: string,
  auditSnapshot: unknown,
  claudeAnalysis: MonitorResult
): Promise<SEOOpportunity[]> {
  const opportunities: SEOOpportunity[] = []

  // Map Claude opportunities to our format
  for (const opp of claudeAnalysis.opportunities ?? []) {
    opportunities.push({
      type: 'quick_win',
      title: opp,
      description: opp,
      estimatedImpact: 'medium',
    })
  }

  // Check for recommended actions that aren't destructive
  for (const action of claudeAnalysis.recommendedActions ?? []) {
    if (!action.isDestructive) {
      opportunities.push({
        type: 'technical_fix',
        title: action.action,
        description: action.action,
        estimatedImpact: action.priority === 'high' ? 'high' : action.priority === 'medium' ? 'medium' : 'low',
      })
    }
  }

  // Check for keywords close to top 3
  const nearTopRankings = await prisma.ranking.findMany({
    where: {
      siteId,
      position: { gte: 4, lte: 10 },
    },
    orderBy: { checkedAt: 'desc' },
    distinct: ['keywordText'],
    take: 20,
  })

  for (const ranking of nearTopRankings) {
    opportunities.push({
      type: 'quick_win',
      title: `"${ranking.keywordText}" en posición ${ranking.position} — near top 3`,
      description: `Keyword cerca del top 3. Optimizar contenido en ${ranking.url} para subir.`,
      estimatedImpact: 'high',
      keyword: ranking.keywordText,
      url: ranking.url,
    })
  }

  return opportunities
}
