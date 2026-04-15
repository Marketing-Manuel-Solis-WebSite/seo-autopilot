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
    const clamped = Math.min(100, Math.max(0, input.auditScore))
    score += clamped * weights.audit
    totalWeight += weights.audit
  }
  if (input.rankingTrend !== undefined) {
    // Normalize trend: clamp to [-10, +10] range, then map to 0-100
    // +10 positions = 100, 0 = 50, -10 positions = 0
    const clampedTrend = Math.min(10, Math.max(-10, input.rankingTrend))
    const rankScore = 50 + clampedTrend * 5
    score += rankScore * weights.ranking
    totalWeight += weights.ranking
  }
  if (input.contentScore !== undefined) {
    const clamped = Math.min(100, Math.max(0, input.contentScore))
    score += clamped * weights.content
    totalWeight += weights.content
  }
  if (input.technicalScore !== undefined) {
    const clamped = Math.min(100, Math.max(0, input.technicalScore))
    score += clamped * weights.technical
    totalWeight += weights.technical
  }
  if (input.backlinkScore !== undefined) {
    const clamped = Math.min(100, Math.max(0, input.backlinkScore))
    score += clamped * weights.backlink
    totalWeight += weights.backlink
  }

  // If we have less than 50% of weights, penalize to avoid misleadingly high scores
  if (totalWeight > 0 && totalWeight < 0.5) {
    return Math.round((score / totalWeight) * 0.8)
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
  return 'Critico'
}
