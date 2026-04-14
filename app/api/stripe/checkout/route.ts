import { stripe, getUnitPriceId } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

// Subscription starts at quantity 0 — real charges are added as
// individual invoice items by the invoice.created webhook handler.

export async function POST() {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  try {
    let subscription = await prisma.subscription.findFirst()
    let customerId: string

    if (subscription) {
      customerId = subscription.stripeCustomerId
    } else {
      const customer = await stripe().customers.create({
        metadata: { app: 'solis-seo-autopilot' },
      })
      customerId = customer.id
      subscription = await prisma.subscription.create({
        data: { stripeCustomerId: customerId, monthlyAmount: 0, status: 'inactive' },
      })
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000'

    const session = await stripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: getUnitPriceId(), quantity: 0 }],
      success_url: `${appUrl}/billing?status=success`,
      cancel_url: `${appUrl}/billing?status=cancelled`,
    })

    return Response.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Checkout]', error)
    return Response.json({ error: 'Error al crear sesion de pago' }, { status: 500 })
  }
}
