import { stripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST() {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  try {
    const subscription = await prisma.subscription.findFirst()

    if (!subscription) {
      return Response.json({ error: 'No hay pago configurado' }, { status: 404 })
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000'

    const session = await stripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    })

    return Response.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Portal]', error)
    return Response.json({ error: 'Error al abrir portal' }, { status: 500 })
  }
}
