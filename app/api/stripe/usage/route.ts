import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function GET() {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  try {
    const sub = await prisma.subscription.findFirst()

    return Response.json({
      status: sub?.status ?? 'inactive',
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      monthlyAmount: sub?.monthlyAmount ?? 0,
    })
  } catch (error) {
    console.error('[Billing]', error)
    return Response.json({ status: 'inactive' })
  }
}
