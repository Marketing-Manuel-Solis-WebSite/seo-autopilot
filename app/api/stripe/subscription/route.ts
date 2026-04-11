import { prisma } from '@/lib/prisma'
import { getLimitsForAmount, getTierLabel } from '@/lib/stripe/client'

export async function GET() {
  try {
    const subscription = await prisma.subscription.findFirst()

    if (!subscription) {
      return Response.json({
        tier: 'Gratis',
        monthlyAmount: 0,
        status: 'inactive',
        limits: { sites: 1, keywords: 10 },
      })
    }

    const amount = subscription.monthlyAmount ?? 0

    return Response.json({
      tier: getTierLabel(amount),
      monthlyAmount: amount,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      limits: getLimitsForAmount(amount),
    })
  } catch (error) {
    console.error('[Stripe Subscription]', error)
    return Response.json({
      tier: 'Gratis',
      monthlyAmount: 0,
      status: 'inactive',
      limits: { sites: 1, keywords: 10 },
    })
  }
}
