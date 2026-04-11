import { prisma } from '@/lib/prisma'
import { PLANS, PlanKey } from '@/lib/stripe/client'

export async function GET() {
  try {
    const subscription = await prisma.subscription.findFirst()

    if (!subscription) {
      return Response.json({
        plan: 'free',
        status: 'inactive',
        limits: { sites: 1, keywords: 10 },
      })
    }

    const planKey = subscription.plan as PlanKey
    const planConfig = PLANS[planKey]

    return Response.json({
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      limits: planConfig?.limits || { sites: 1, keywords: 10 },
    })
  } catch (error) {
    console.error('[Stripe Subscription]', error)
    return Response.json({
      plan: 'free',
      status: 'inactive',
      limits: { sites: 1, keywords: 10 },
    })
  }
}
