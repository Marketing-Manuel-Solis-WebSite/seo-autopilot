import { prisma } from '@/lib/prisma'

export async function getUsage(): Promise<{ sites: number; keywords: number }> {
  const [sites, keywords] = await Promise.all([
    prisma.site.count({ where: { isActive: true } }),
    prisma.keyword.count({ where: { isTracking: true } }),
  ])
  return { sites, keywords }
}
