import { stripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { amount } = (await request.json()) as { amount: number }

    if (!amount || typeof amount !== 'number' || amount < 1 || amount > 10000) {
      return Response.json({ error: 'Monto invalido (min $1, max $10,000)' }, { status: 400 })
    }

    const dollars = Math.round(amount)
    const subscription = await prisma.subscription.findFirst()

    if (!subscription?.stripeSubscriptionId || !subscription.stripeItemId) {
      return Response.json({ error: 'No hay suscripcion activa' }, { status: 404 })
    }

    if (subscription.status !== 'active') {
      return Response.json({ error: 'La suscripcion no esta activa' }, { status: 400 })
    }

    // Update the quantity on the subscription item — new amount takes effect next billing cycle
    await stripe().subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{ id: subscription.stripeItemId, quantity: dollars }],
      proration_behavior: 'none',
    })

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { monthlyAmount: dollars },
    })

    return Response.json({ monthlyAmount: dollars })
  } catch (error) {
    console.error('[Stripe Update Amount]', error)
    return Response.json({ error: 'Error al actualizar monto' }, { status: 500 })
  }
}
