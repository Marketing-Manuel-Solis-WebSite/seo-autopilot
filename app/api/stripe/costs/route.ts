import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { MONTHLY_AMOUNT_USD, PROVIDER_LABELS } from '@/lib/billing/constants'

interface MonthRow {
  month: string
  provider: string
  total_cents: bigint
}

/**
 * Informational endpoint: shows API cost breakdown per month.
 * The subscription is a flat $700/month — this is for internal visibility only.
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
        label: PROVIDER_LABELS[row.provider] ?? row.provider,
        costUsd: Math.round(costUsd * 100) / 100,
      })
    }

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    if (!monthsMap.has(currentMonth)) {
      monthsMap.set(currentMonth, [])
    }

    const months = Array.from(monthsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, providers]) => {
        const apiTotalUsd = providers.reduce((sum, p) => sum + p.costUsd, 0)
        return {
          month,
          providers,
          apiTotalUsd: Math.round(apiTotalUsd * 100) / 100,
          subscriptionUsd: MONTHLY_AMOUNT_USD,
        }
      })

    return Response.json({ months })
  } catch (error) {
    console.error('[Stripe Costs]', error)
    return Response.json({ months: [] }, { status: 500 })
  }
}
