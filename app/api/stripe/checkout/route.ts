import { stripe, getUnitPriceId } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { SUBSCRIPTION_QUANTITY } from '@/lib/billing/constants'

export async function POST() {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  try {
    let subscription = await prisma.subscription.findFirst()
    let customerId: string

    if (subscription) {
      // If there's already an active subscription, don't create another
      if (subscription.stripeSubscriptionId && subscription.status === 'active') {
        return Response.json(
          { error: 'Ya existe una suscripcion activa' },
          { status: 400 },
        )
      }
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
      line_items: [{ price: getUnitPriceId(), quantity: SUBSCRIPTION_QUANTITY }],
      success_url: `${appUrl}/billing?status=success`,
      cancel_url: `${appUrl}/billing?status=cancelled`,
    })

    return Response.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Checkout]', error)
    return Response.json({ error: 'Error al crear sesion de pago' }, { status: 500 })
  }
}
