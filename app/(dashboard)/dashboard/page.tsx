import { prisma } from '@/lib/prisma'
import GlobalMetricsBar from '@/components/dashboard/GlobalMetricsBar'
import SiteHealthGrid from '@/components/dashboard/SiteHealthGrid'
import AlertsFeed from '@/components/dashboard/AlertsFeed'
import RecentActivity from '@/components/dashboard/RecentActivity'
import QuickStats from '@/components/dashboard/QuickStats'
import PageHeader from '@/components/layout/PageHeader'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const [sites, recentAlerts, recentActivity, pendingFixes, pendingContent, totalKeywords, totalBacklinks] = await Promise.all([
    prisma.site.findMany({
      where: { isActive: true },
      include: {
        audits: { orderBy: { createdAt: 'desc' }, take: 1 },
        alerts: { where: { isRead: false }, orderBy: { createdAt: 'desc' }, take: 5 },
        rankings: { orderBy: { checkedAt: 'desc' }, take: 10 },
      },
    }),
    prisma.alert.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { site: { select: { name: true, domain: true } } },
    }),
    prisma.monitoringLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { site: { select: { name: true } } },
    }),
    prisma.fix.count({ where: { status: 'pending_approval' } }),
    prisma.content.count({ where: { status: 'pending_approval' } }),
    prisma.keyword.count({ where: { isTracking: true } }),
    prisma.backlink.count({ where: { isActive: true } }),
  ])

  return { sites, recentAlerts, recentActivity, pendingFixes, pendingContent, totalKeywords, totalBacklinks }
}

export default async function DashboardPage() {
  const { sites, recentAlerts, recentActivity, pendingFixes, pendingContent, totalKeywords, totalBacklinks } = await getDashboardData()

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Dashboard" description="Vista general de todos los sitios" />

      <GlobalMetricsBar sites={sites} />

      {recentAlerts.some(a => a.severity === 'critical') && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <h2 className="mb-2 font-medium text-red-500">
            Alertas críticas requieren atención
          </h2>
          <AlertsFeed alerts={recentAlerts.filter(a => a.severity === 'critical')} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SiteHealthGrid sites={sites} />
        </div>
        <QuickStats
          pendingFixes={pendingFixes}
          pendingContent={pendingContent}
          totalKeywords={totalKeywords}
          totalBacklinks={totalBacklinks}
        />
      </div>

      <RecentActivity logs={recentActivity} />
    </div>
  )
}
