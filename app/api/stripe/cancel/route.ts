import { stripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST() {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  try {
    const subscription = await prisma.subscription.findFirst()

    if (!subscription?.stripeSubscriptionId || subscription.status === 'cancelled') {
      return Response.json({ error: 'No hay suscripcion activa' }, { status: 404 })
    }

    const stripeSub = await stripe().subscriptions.retrieve(subscription.stripeSubscriptionId)

    if (stripeSub.status === 'canceled') {
      return Response.json({ error: 'La suscripcion ya fue cancelada' }, { status: 400 })
    }

    if (stripeSub.cancel_at_period_end) {
      // Already scheduled for cancellation — reactivate
      const updated = await stripe().subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      })

      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.stripeSubscriptionId },
        data: { cancelAtPeriodEnd: false },
      })

      return Response.json({ cancelAtPeriodEnd: updated.cancel_at_period_end })
    } else {
      // Cancel at end of current period
      const updated = await stripe().subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })

      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.stripeSubscriptionId },
        data: { cancelAtPeriodEnd: true },
      })

      return Response.json({ cancelAtPeriodEnd: updated.cancel_at_period_end })
    }
  } catch (error) {
    console.error('[Stripe Cancel]', error)
    return Response.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}
