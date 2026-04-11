import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

function getSubscriptionPeriod(sub: Stripe.Subscription) {
  const item = sub.items.data[0]
  return {
    start: item ? new Date(item.current_period_start * 1000) : new Date(),
    end: item ? new Date(item.current_period_end * 1000) : new Date(),
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return Response.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription && session.customer) {
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id
          const customerId = typeof session.customer === 'string'
            ? session.customer
            : session.customer.id

          const stripeSubscription = await stripe().subscriptions.retrieve(subscriptionId)
          const priceId = stripeSubscription.items.data[0]?.price.id
          const period = getSubscriptionPeriod(stripeSubscription)

          await prisma.subscription.upsert({
            where: { stripeCustomerId: customerId },
            update: {
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              plan: session.metadata?.plan || 'starter',
              status: 'active',
              currentPeriodStart: period.start,
              currentPeriodEnd: period.end,
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            },
            create: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              plan: session.metadata?.plan || 'starter',
              status: 'active',
              currentPeriodStart: period.start,
              currentPeriodEnd: period.end,
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const period = getSubscriptionPeriod(sub)

        const status = sub.status === 'active' || sub.status === 'trialing'
          ? 'active'
          : sub.status === 'past_due'
            ? 'past_due'
            : 'inactive'

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status,
            stripePriceId: sub.items.data[0]?.price.id,
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: 'cancelled',
            plan: 'free',
            stripeSubscriptionId: null,
            stripePriceId: null,
            cancelAtPeriodEnd: false,
          },
        })
        break
      }

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
