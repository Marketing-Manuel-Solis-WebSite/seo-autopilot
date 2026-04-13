import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Cron job: checks subscription status is still active.
 * Billing is fixed at $700/month — no quantity adjustments needed.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sub = await prisma.subscription.findFirst()

    if (!sub?.stripeSubscriptionId || sub.status !== 'active') {
      return NextResponse.json({ message: 'No active subscription', skipped: true })
    }

    return NextResponse.json({
      message: 'Subscription active',
      status: sub.status,
      monthlyAmount: sub.monthlyAmount,
    })
  } catch (error) {
    console.error('[Sync Billing]', error)
    return NextResponse.json({ error: 'Failed to check billing' }, { status: 500 })
  }
}
