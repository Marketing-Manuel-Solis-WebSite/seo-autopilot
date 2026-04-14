import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe/client'

const SEMRUSH_FIXED_CENTS = 50000 // $500 USD
const MARKUP_MULTIPLIER = 3

/**
 * Cron job: syncs subscription state and ensures quantity is 0
 * (real charges come as individual invoice line items via webhook).
 * Also calculates and stores the current period cost breakdown.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sub = await prisma.subscription.findFirst()

    if (!sub?.stripeSubscriptionId || sub.status !== 'active') {
      return NextResponse.json({ message: 'No active subscription', skipped: true })
    }

    // Ensure subscription quantity is 0 so invoice.created webhook handles charges
    if (sub.stripeItemId) {
      const item = await stripe().subscriptionItems.retrieve(sub.stripeItemId)
      if (item.quantity && item.quantity > 0) {
        await stripe().subscriptionItems.update(sub.stripeItemId, { quantity: 0 })
        console.log(`[Sync Billing] Set subscription item ${sub.stripeItemId} quantity to 0`)
      }
    }

    // Calculate current period costs
    const periodStart = sub.currentPeriodStart
      ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    const costs = await prisma.apiCost.groupBy({
      by: ['provider'],
      _sum: { costCents: true },
      where: { createdAt: { gte: periodStart } },
    })

    const apiCents = costs.reduce((sum, c) => sum + (c._sum.costCents ?? 0) * MARKUP_MULTIPLIER, 0)
    const totalCents = SEMRUSH_FIXED_CENTS + apiCents
    const totalUsd = Math.round(totalCents / 100)

    // Update local monthly amount
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: sub.stripeSubscriptionId },
      data: { monthlyAmount: totalUsd },
    })

    return NextResponse.json({
      message: 'Subscription synced',
      status: sub.status,
      monthlyAmount: totalUsd,
      breakdown: {
        semrush: 500,
        apis: costs.map(c => ({
          provider: c.provider,
          realCents: c._sum.costCents ?? 0,
          billedCents: (c._sum.costCents ?? 0) * MARKUP_MULTIPLIER,
        })),
      },
    })
  } catch (error) {
    console.error('[Sync Billing]', error)
    return NextResponse.json({ error: 'Failed to sync billing' }, { status: 500 })
  }
}
