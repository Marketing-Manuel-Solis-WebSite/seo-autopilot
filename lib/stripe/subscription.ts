import { prisma } from '@/lib/prisma'
import { getLimitsForAmount, getTierLabel } from './client'

export interface SubscriptionStatus {
  tier: string
  monthlyAmount: number
  status: 'active' | 'past_due' | 'inactive' | 'cancelled'
  limits: { sites: number; keywords: number }
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

const FREE_LIMITS = { sites: 1, keywords: 10 }

export async function getSubscription(): Promise<SubscriptionStatus> {
  try {
    const sub = await prisma.subscription.findFirst()

    if (!sub || sub.status !== 'active') {
      return {
        tier: 'Gratis',
        monthlyAmount: 0,
        status: (sub?.status as SubscriptionStatus['status']) || 'inactive',
        limits: FREE_LIMITS,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      }
    }

    const amount = sub.monthlyAmount ?? 0

    return {
      tier: getTierLabel(amount),
      monthlyAmount: amount,
      status: 'active',
      limits: getLimitsForAmount(amount),
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    }
  } catch {
    return {
      tier: 'Gratis',
      monthlyAmount: 0,
      status: 'inactive',
      limits: FREE_LIMITS,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }
  }
}

export async function getUsage(): Promise<{ sites: number; keywords: number }> {
  const [sites, keywords] = await Promise.all([
    prisma.site.count({ where: { isActive: true } }),
    prisma.keyword.count({ where: { isTracking: true } }),
  ])
  return { sites, keywords }
}

export async function checkLimit(resource: 'sites' | 'keywords'): Promise<{
  allowed: boolean
  current: number
  limit: number
  tier: string
}> {
  const [subscription, usage] = await Promise.all([
    getSubscription(),
    getUsage(),
  ])

  const current = usage[resource]
  const limit = subscription.limits[resource]

  return {
    allowed: current < limit,
    current,
    limit,
    tier: subscription.tier,
  }
}
