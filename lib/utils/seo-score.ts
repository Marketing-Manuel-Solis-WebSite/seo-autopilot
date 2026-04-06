export interface SEOScoreInput {
  auditScore?: number
  rankingTrend?: number // positive = improving
  contentScore?: number
  technicalScore?: number
  backlinkScore?: number
}

export function calculateSEOScore(input: SEOScoreInput): number {
  const weights = {
    audit: 0.25,
    ranking: 0.30,
    content: 0.20,
    technical: 0.15,
    backlink: 0.10,
  }

  let score = 0
  let totalWeight = 0

  if (input.auditScore !== undefined) {
    score += input.auditScore * weights.audit
    totalWeight += weights.audit
  }
  if (input.rankingTrend !== undefined) {
    const rankScore = Math.min(100, Math.max(0, 50 + input.rankingTrend * 5))
    score += rankScore * weights.ranking
    totalWeight += weights.ranking
  }
  if (input.contentScore !== undefined) {
    score += input.contentScore * weights.content
    totalWeight += weights.content
  }
  if (input.technicalScore !== undefined) {
    score += input.technicalScore * weights.technical
    totalWeight += weights.technical
  }
  if (input.backlinkScore !== undefined) {
    score += input.backlinkScore * weights.backlink
    totalWeight += weights.backlink
  }

  return totalWeight > 0 ? Math.round(score / totalWeight) : 0
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500'
  if (score >= 60) return 'text-yellow-500'
  if (score >= 40) return 'text-orange-500'
  return 'text-red-500'
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Bueno'
  if (score >= 40) return 'Necesita mejoras'
  return 'Crítico'
}
