import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { MONTHLY_AMOUNT_USD } from '@/lib/billing/constants'

/**
 * Extracts subscription period and item details from a Stripe Subscription.
 */
function getSubscriptionDetails(sub: Stripe.Subscription) {
  const item = sub.items.data[0]
  return {
    start: item ? new Date(item.current_period_start * 1000) : new Date(),
    end: item ? new Date(item.current_period_end * 1000) : new Date(),
    itemId: item?.id ?? null,
    priceId: item?.price.id ?? null,
  }
}

/**
 * Maps Stripe subscription status to our internal status.
 */
function mapStatus(stripeStatus: Stripe.Subscription.Status): string {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active'
  if (stripeStatus === 'past_due') return 'past_due'
  return 'inactive'
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return Response.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set')
      return Response.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    event = stripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      // ── Checkout completed → activate subscription ──────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription' || !session.subscription || !session.customer) break

        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer.id

        const stripeSubscription = await stripe().subscriptions.retrieve(subscriptionId)
        const details = getSubscriptionDetails(stripeSubscription)

        await prisma.subscription.upsert({
          where: { stripeCustomerId: customerId },
          update: {
            stripeSubscriptionId: subscriptionId,
            stripeItemId: details.itemId,
            stripePriceId: details.priceId,
            monthlyAmount: MONTHLY_AMOUNT_USD,
            status: 'active',
            currentPeriodStart: details.start,
            currentPeriodEnd: details.end,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          },
          create: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripeItemId: details.itemId,
            stripePriceId: details.priceId,
            monthlyAmount: MONTHLY_AMOUNT_USD,
            status: 'active',
            currentPeriodStart: details.start,
            currentPeriodEnd: details.end,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          },
        })
        console.log(`[Stripe Webhook] checkout.session.completed — subscription ${subscriptionId} activated`)
        break
      }

      // ── Subscription updated → sync status and period ───────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const details = getSubscriptionDetails(sub)
        const status = mapStatus(sub.status)

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status,
            stripeItemId: details.itemId,
            stripePriceId: details.priceId,
            monthlyAmount: status === 'active' ? MONTHLY_AMOUNT_USD : 0,
            currentPeriodStart: details.start,
            currentPeriodEnd: details.end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        })
        console.log(`[Stripe Webhook] subscription.updated — ${customerId} → ${status}`)
        break
      }

      // ── Subscription deleted → mark cancelled ───────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: 'cancelled',
            monthlyAmount: 0,
            stripeSubscriptionId: null,
            stripeItemId: null,
            stripePriceId: null,
            cancelAtPeriodEnd: false,
          },
        })
        console.log(`[Stripe Webhook] subscription.deleted — ${customerId} cancelled`)
        break
      }

      // ── Payment succeeded → reactivate if past_due ──────────────────
      case 'invoice.payment_succeeded': {
        const paidInvoice = event.data.object as Stripe.Invoice
        const paidCustomerId = typeof paidInvoice.customer === 'string'
          ? paidInvoice.customer
          : paidInvoice.customer?.id

        if (paidCustomerId) {
          await prisma.subscription.updateMany({
            where: { stripeCustomerId: paidCustomerId, status: 'past_due' },
            data: { status: 'active', monthlyAmount: MONTHLY_AMOUNT_USD },
          })
        }
        break
      }

      // ── Payment failed → mark past_due ──────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id

        if (customerId) {
          await prisma.subscription.updateMany({
            where: { stripeCustomerId: customerId },
            data: { status: 'past_due' },
          })
        }
        break
      }
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Processing error:', error)
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
