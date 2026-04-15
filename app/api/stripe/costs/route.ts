import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import {
  MONTHLY_AMOUNT_USD,
  PROVIDER_LABELS,
  FIXED_COSTS,
  TOTAL_FIXED_COSTS_USD,
  VARIABLE_COST_LABELS,
} from '@/lib/billing/constants'

interface MonthRow {
  month: string
  provider: string
  total_cents: bigint
}

/**
 * Informational endpoint: shows full cost breakdown per month.
 * Fixed costs (Semrush, infrastructure, monitoring) + variable API costs + subscription total.
 */
export async function GET() {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  try {
    const rows = await prisma.$queryRaw<MonthRow[]>`
      SELECT
        to_char("createdAt", 'YYYY-MM') AS month,
        provider,
        SUM("costCents") AS total_cents
      FROM "ApiCost"
      GROUP BY month, provider
      ORDER BY month DESC, total_cents DESC
    `

    const monthsMap = new Map<string, { provider: string; label: string; costUsd: number }[]>()

    for (const row of rows) {
      const costUsd = Number(row.total_cents) / 100

      if (!monthsMap.has(row.month)) {
        monthsMap.set(row.month, [])
      }
      monthsMap.get(row.month)!.push({
        provider: row.provider,
        label: PROVIDER_LABELS[row.provider] ?? VARIABLE_COST_LABELS[row.provider] ?? row.provider,
        costUsd: Math.round(costUsd * 100) / 100,
      })
    }

    // Ensure current month always shows
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    if (!monthsMap.has(currentMonth)) {
      monthsMap.set(currentMonth, [])
    }

    const months = Array.from(monthsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, variableCosts]) => {
        const variableTotalUsd = variableCosts.reduce((sum, p) => sum + p.costUsd, 0)
        return {
          month,
          fixedCosts: FIXED_COSTS.map(c => ({
            id: c.id,
            label: c.label,
            description: c.description,
            costUsd: c.monthlyCostUsd,
          })),
          fixedTotalUsd: TOTAL_FIXED_COSTS_USD,
          variableCosts,
          variableTotalUsd: Math.round(variableTotalUsd * 100) / 100,
          totalOperationalUsd: Math.round((TOTAL_FIXED_COSTS_USD + variableTotalUsd) * 100) / 100,
          subscriptionUsd: MONTHLY_AMOUNT_USD,
        }
      })

    return Response.json({ months, fixedCosts: FIXED_COSTS })
  } catch (error) {
    console.error('[Stripe Costs]', error)
    return Response.json({ months: [], fixedCosts: FIXED_COSTS }, { status: 500 })
  }
}
