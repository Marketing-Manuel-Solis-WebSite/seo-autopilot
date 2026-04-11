import { NextRequest } from 'next/server'
import { stripe, PLANS, PlanKey } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { plan } = (await request.json()) as { plan: string }

    if (!plan || !(plan in PLANS)) {
      return Response.json({ error: 'Plan invalido' }, { status: 400 })
    }

    const selectedPlan = PLANS[plan as PlanKey]

    // Get or create subscription record to find/create Stripe customer
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
        data: {
          stripeCustomerId: customerId,
          plan: 'free',
          status: 'inactive',
        },
      })
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000'

    const session = await stripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?status=success`,
      cancel_url: `${appUrl}/billing?status=cancelled`,
      metadata: { plan },
    })

    return Response.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Checkout]', error)
    return Response.json({ error: 'Error al crear sesion de pago' }, { status: 500 })
  }
}
