import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { SEMRUSH_FIXED_USD, MARKUP_MULTIPLIER } from '@/lib/billing/constants'

interface MonthRow {
  month: string
  provider: string
  total_cents: bigint
}

export async function GET() {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  try {
    // Group costs by month and provider
    const rows = await prisma.$queryRaw<MonthRow[]>`
      SELECT
        to_char("createdAt", 'YYYY-MM') AS month,
        provider,
        SUM("costCents") AS total_cents
      FROM "ApiCost"
      GROUP BY month, provider
      ORDER BY month DESC, total_cents DESC
    `

    // Build month map
    const monthsMap = new Map<string, { provider: string; costUsd: number }[]>()

    for (const row of rows) {
      const costUsd = (Number(row.total_cents) / 100) * MARKUP_MULTIPLIER

      if (!monthsMap.has(row.month)) {
        monthsMap.set(row.month, [])
      }
      monthsMap.get(row.month)!.push({
        provider: row.provider,
        costUsd: Math.round(costUsd * 100) / 100,
      })
    }

    // Also include the current month even if no API costs yet
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    if (!monthsMap.has(currentMonth)) {
      monthsMap.set(currentMonth, [])
    }

    // Build final response
    const months = Array.from(monthsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12) // Last 12 months max
      .map(([month, providers]) => {
        const apiTotal = providers.reduce((sum, p) => sum + p.costUsd, 0)
        return {
          month,
          semrushUsd: SEMRUSH_FIXED_USD,
          providers,
          apiTotalUsd: Math.round(apiTotal * 100) / 100,
          grandTotalUsd: Math.round((SEMRUSH_FIXED_USD + apiTotal) * 100) / 100,
        }
      })

    return Response.json({ months })
  } catch (error) {
    console.error('[Stripe Costs]', error)
    return Response.json({ months: [] }, { status: 500 })
  }
}
