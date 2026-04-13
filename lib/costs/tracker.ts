import { prisma } from '@/lib/prisma'

// Claude pricing (per million tokens)
const PRICING = {
  'claude-opus':   { input: 15,  output: 75 },
  'claude-sonnet': { input: 3,   output: 15 },
} as const

/** Log a Claude API call cost based on token usage. */
export async function logClaudeCost(
  model: 'claude-opus' | 'claude-sonnet',
  inputTokens: number,
  outputTokens: number,
  detail?: string,
) {
  const p = PRICING[model]
  const costDollars = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output
  const costCents = Math.round(costDollars * 100)
  if (costCents <= 0) return

  try {
    await prisma.apiCost.create({
      data: { provider: model, costCents, detail },
    })
  } catch (e) {
    console.error('[ApiCost] Failed to log:', e)
  }
}

/** Log a DataForSEO API call cost (they return cost in dollars). */
export async function logDataForSEOCost(costDollars: number, detail?: string) {
  const costCents = Math.round(costDollars * 100)
  if (costCents <= 0) return

  try {
    await prisma.apiCost.create({
      data: { provider: 'dataforseo', costCents, detail },
    })
  } catch (e) {
    console.error('[ApiCost] Failed to log:', e)
  }
}

/** Get total cost in cents for the current billing period (or calendar month). */
export async function getCurrentPeriodCostCents(): Promise<number> {
  const sub = await prisma.subscription.findFirst()

  // Use billing period if available, otherwise current calendar month
  const periodStart = sub?.currentPeriodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const result = await prisma.apiCost.aggregate({
    _sum: { costCents: true },
    where: { createdAt: { gte: periodStart } },
  })

  return result._sum.costCents ?? 0
}

/** Get cost breakdown by provider for current period. */
export async function getCurrentPeriodBreakdown(): Promise<Array<{ provider: string; totalCents: number }>> {
  const sub = await prisma.subscription.findFirst()
  const periodStart = sub?.currentPeriodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const groups = await prisma.apiCost.groupBy({
    by: ['provider'],
    _sum: { costCents: true },
    where: { createdAt: { gte: periodStart } },
    orderBy: { _sum: { costCents: 'desc' } },
  })

  return groups.map(g => ({
    provider: g.provider,
    totalCents: g._sum.costCents ?? 0,
  }))
}
