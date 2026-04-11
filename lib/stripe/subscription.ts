import { prisma } from '@/lib/prisma'
import { PLANS, PlanKey } from './client'

export interface SubscriptionStatus {
  plan: PlanKey | 'free'
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
        plan: 'free',
        status: sub?.status as SubscriptionStatus['status'] || 'inactive',
        limits: FREE_LIMITS,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      }
    }

    const planKey = sub.plan as PlanKey
    const planConfig = PLANS[planKey]

    return {
      plan: planKey,
      status: 'active',
      limits: planConfig?.limits || FREE_LIMITS,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    }
  } catch {
    return {
      plan: 'free',
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
  plan: string
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
    plan: subscription.plan,
  }
}
