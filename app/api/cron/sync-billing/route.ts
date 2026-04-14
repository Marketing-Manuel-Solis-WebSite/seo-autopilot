import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe/client'
import { MONTHLY_AMOUNT_USD } from '@/lib/billing/constants'

/**
 * Cron job: syncs local subscription record with Stripe.
 * Ensures status, period dates, and monthly amount are accurate.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sub = await prisma.subscription.findFirst()

    if (!sub?.stripeSubscriptionId) {
      return NextResponse.json({ message: 'No subscription to sync', skipped: true })
    }

    // Retrieve the real subscription from Stripe
    const stripeSub = await stripe().subscriptions.retrieve(sub.stripeSubscriptionId)

    const item = stripeSub.items.data[0]
    const isActive = stripeSub.status === 'active' || stripeSub.status === 'trialing'
    const status = isActive
      ? 'active'
      : stripeSub.status === 'past_due'
        ? 'past_due'
        : stripeSub.status === 'canceled'
          ? 'cancelled'
          : 'inactive'

    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: sub.stripeSubscriptionId },
      data: {
        status,
        monthlyAmount: isActive ? MONTHLY_AMOUNT_USD : 0,
        stripeItemId: item?.id ?? null,
        stripePriceId: item?.price.id ?? null,
        currentPeriodStart: item ? new Date(item.current_period_start * 1000) : null,
        currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
    })

    return NextResponse.json({
      message: 'Subscription synced',
      status,
      monthlyAmount: isActive ? MONTHLY_AMOUNT_USD : 0,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    })
  } catch (error) {
    console.error('[Sync Billing]', error)
    return NextResponse.json({ error: 'Failed to sync billing' }, { status: 500 })
  }
}
