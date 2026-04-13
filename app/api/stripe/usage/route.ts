import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const sub = await prisma.subscription.findFirst()

    return Response.json({
      status: sub?.status ?? 'inactive',
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    })
  } catch (error) {
    console.error('[Billing]', error)
    return Response.json({ status: 'inactive' })
  }
}
