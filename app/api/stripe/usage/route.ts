import { getSubscription, getUsage } from '@/lib/stripe/subscription'

export async function GET() {
  try {
    const [subscription, usage] = await Promise.all([
      getSubscription(),
      getUsage(),
    ])

    return Response.json({
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      limits: subscription.limits,
      usage,
    })
  } catch (error) {
    console.error('[Stripe Usage]', error)
    return Response.json(
      { plan: 'free', status: 'inactive', limits: { sites: 1, keywords: 10 }, usage: { sites: 0, keywords: 0 } },
    )
  }
}
