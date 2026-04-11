import { NextRequest } from 'next/server'
import { stripe, getUnitPriceId } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { amount } = (await request.json()) as { amount: number }

    if (!amount || typeof amount !== 'number' || amount < 1 || amount > 10000) {
      return Response.json({ error: 'Monto invalido (min $1, max $10,000)' }, { status: 400 })
    }

    const dollars = Math.round(amount)

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
          monthlyAmount: 0,
          status: 'inactive',
        },
      })
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000'

    const session = await stripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: getUnitPriceId(), quantity: dollars }],
      success_url: `${appUrl}/billing?status=success`,
      cancel_url: `${appUrl}/billing?status=cancelled`,
      metadata: { monthlyAmount: String(dollars) },
    })

    return Response.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Checkout]', error)
    return Response.json({ error: 'Error al crear sesion de pago' }, { status: 500 })
  }
}
