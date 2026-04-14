import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { MONTHLY_AMOUNT_USD } from '@/lib/billing/constants'

export async function GET() {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  try {
    const sub = await prisma.subscription.findFirst()

    const isActive = sub?.status === 'active' || sub?.status === 'past_due'

    return Response.json({
      status: sub?.status ?? 'inactive',
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      monthlyAmount: isActive ? MONTHLY_AMOUNT_USD : 0,
    })
  } catch (error) {
    console.error('[Billing]', error)
    return Response.json({ status: 'inactive', monthlyAmount: 0 })
  }
}
