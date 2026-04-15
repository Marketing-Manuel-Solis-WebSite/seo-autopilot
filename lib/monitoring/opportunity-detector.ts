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
  const seen = new Set<string>()

  function addUnique(opp: SEOOpportunity) {
    const key = `${opp.type}:${opp.title}`
    if (seen.has(key)) return
    seen.add(key)
    opportunities.push(opp)
  }

  // Map Claude opportunities to our format
  for (const opp of claudeAnalysis.opportunities ?? []) {
    addUnique({
      type: 'quick_win',
      title: opp,
      description: opp,
      estimatedImpact: 'medium',
    })
  }

  // Check for recommended actions that aren't destructive
  for (const action of claudeAnalysis.recommendedActions ?? []) {
    if (!action.isDestructive) {
      addUnique({
        type: 'technical_fix',
        title: action.action,
        description: action.action,
        estimatedImpact: action.priority === 'high' ? 'high' : action.priority === 'medium' ? 'medium' : 'low',
      })
    }
  }

  // Check for keywords close to top 3 (positions 4-10) — high impact quick wins
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
    addUnique({
      type: 'quick_win',
      title: `"${ranking.keywordText}" en posicion ${ranking.position} — near top 3`,
      description: `Keyword cerca del top 3. Optimizar contenido en ${ranking.url} para subir.`,
      estimatedImpact: ranking.position <= 5 ? 'high' : 'medium',
      keyword: ranking.keywordText,
      url: ranking.url,
    })
  }

  // Check for keywords at positions 11-20 — medium impact growth opportunities
  const pageTwo = await prisma.ranking.findMany({
    where: {
      siteId,
      position: { gte: 11, lte: 20 },
    },
    orderBy: { checkedAt: 'desc' },
    distinct: ['keywordText'],
    take: 10,
  })

  for (const ranking of pageTwo) {
    addUnique({
      type: 'content_gap',
      title: `"${ranking.keywordText}" en posicion ${ranking.position} — pagina 2`,
      description: `Keyword en pagina 2. Reforzar contenido y backlinks para llegar a pagina 1.`,
      estimatedImpact: 'medium',
      keyword: ranking.keywordText,
      url: ranking.url,
    })
  }

  // Sort by impact priority
  const impactOrder = { high: 0, medium: 1, low: 2 }
  opportunities.sort((a, b) => impactOrder[a.estimatedImpact] - impactOrder[b.estimatedImpact])

  return opportunities
}
