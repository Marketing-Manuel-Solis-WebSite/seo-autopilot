import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const SEMRUSH_FIXED_CENTS = 50000 // $500 USD
const MARKUP_MULTIPLIER = 3

const PROVIDER_LABELS: Record<string, string> = {
  'claude-opus': 'Claude Opus — Analisis IA',
  'claude-sonnet': 'Claude Sonnet — Monitoreo IA',
  'dataforseo': 'DataForSEO — Datos SERP',
}

function getSubscriptionDetails(sub: Stripe.Subscription) {
  const item = sub.items.data[0]
  return {
    start: item ? new Date(item.current_period_start * 1000) : new Date(),
    end: item ? new Date(item.current_period_end * 1000) : new Date(),
    quantity: item?.quantity ?? 0,
    itemId: item?.id ?? null,
    priceId: item?.price.id ?? null,
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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set')
      return Response.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    event = stripe().webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
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
          const details = getSubscriptionDetails(stripeSubscription)

          await prisma.subscription.upsert({
            where: { stripeCustomerId: customerId },
            update: {
              stripeSubscriptionId: subscriptionId,
              stripeItemId: details.itemId,
              stripePriceId: details.priceId,
              monthlyAmount: details.quantity,
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
              monthlyAmount: details.quantity,
              status: 'active',
              currentPeriodStart: details.start,
              currentPeriodEnd: details.end,
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const details = getSubscriptionDetails(sub)

        const status = sub.status === 'active' || sub.status === 'trialing'
          ? 'active'
          : sub.status === 'past_due'
            ? 'past_due'
            : 'inactive'

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status,
            stripeItemId: details.itemId,
            stripePriceId: details.priceId,
            monthlyAmount: details.quantity,
            currentPeriodStart: details.start,
            currentPeriodEnd: details.end,
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
            monthlyAmount: 0,
            stripeSubscriptionId: null,
            stripeItemId: null,
            stripePriceId: null,
            cancelAtPeriodEnd: false,
          },
        })
        break
      }

      case 'invoice.created': {
        // Invoice is in draft — add itemized cost breakdown
        const createdInvoice = event.data.object as Stripe.Invoice
        const isSubscriptionInvoice = createdInvoice.parent?.subscription_details != null
        if (createdInvoice.status !== 'draft' || !isSubscriptionInvoice) break

        const invoiceCustomerId = typeof createdInvoice.customer === 'string'
          ? createdInvoice.customer
          : createdInvoice.customer?.id
        if (!invoiceCustomerId) break

        try {
          // Get billing period from local subscription
          const localSub = await prisma.subscription.findFirst({
            where: { stripeCustomerId: invoiceCustomerId },
          })
          const periodStart = localSub?.currentPeriodStart
            ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)

          // Calculate API costs for the period
          const costs = await prisma.apiCost.groupBy({
            by: ['provider'],
            _sum: { costCents: true },
            where: { createdAt: { gte: periodStart } },
          })

          // Add Semrush fixed cost line item
          await stripe().invoiceItems.create({
            customer: invoiceCustomerId,
            invoice: createdInvoice.id,
            amount: SEMRUSH_FIXED_CENTS,
            currency: 'usd',
            description: 'Semrush — Herramientas SEO (fijo mensual)',
          })

          // Add each API provider as a separate line item (real cost × 3)
          let apiTotalCents = 0
          for (const cost of costs) {
            const realCents = cost._sum.costCents ?? 0
            const billedCents = realCents * MARKUP_MULTIPLIER
            if (billedCents <= 0) continue

            apiTotalCents += billedCents
            const label = PROVIDER_LABELS[cost.provider] ?? cost.provider

            await stripe().invoiceItems.create({
              customer: invoiceCustomerId,
              invoice: createdInvoice.id,
              amount: billedCents,
              currency: 'usd',
              description: label,
            })
          }

          // Ensure subscription quantity is 0 so it doesn't add its own charge
          if (localSub?.stripeItemId) {
            await stripe().subscriptionItems.update(localSub.stripeItemId, {
              quantity: 0,
            })
          }

          // Update local record with the billed total
          const totalCents = SEMRUSH_FIXED_CENTS + apiTotalCents
          if (localSub) {
            await prisma.subscription.updateMany({
              where: { stripeCustomerId: invoiceCustomerId },
              data: { monthlyAmount: Math.round(totalCents / 100) },
            })
          }

          console.log(`[Stripe Webhook] Invoice ${createdInvoice.id} — added ${costs.length + 1} line items, total $${(totalCents / 100).toFixed(2)}`)
        } catch (err) {
          console.error('[Stripe Webhook] Failed to add invoice line items:', err)
        }
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
