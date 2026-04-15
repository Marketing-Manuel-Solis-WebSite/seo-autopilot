import { prisma } from '@/lib/prisma'
import GlobalMetricsBar from '@/components/dashboard/GlobalMetricsBar'
import SiteHealthGrid from '@/components/dashboard/SiteHealthGrid'
import AlertsFeed from '@/components/dashboard/AlertsFeed'
import RecentActivity from '@/components/dashboard/RecentActivity'
import QuickStats from '@/components/dashboard/QuickStats'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

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

  const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical')
  const warningAlerts = recentAlerts.filter(a => a.severity === 'warning')

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Dashboard"
        description={`${sites.length} sitios monitoreados activamente`}
      />

      <GlobalMetricsBar sites={sites} />

      {/* Critical alerts banner */}
      {criticalAlerts.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-red-500">
              <AlertTriangle className="h-5 w-5" />
              {criticalAlerts.length} alerta{criticalAlerts.length > 1 ? 's' : ''} critica{criticalAlerts.length > 1 ? 's' : ''} requiere{criticalAlerts.length > 1 ? 'n' : ''} atencion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertsFeed alerts={criticalAlerts} />
            <Link
              href="/alerts"
              className="mt-3 inline-block text-xs font-medium text-red-500 hover:underline"
            >
              Ver todas las alertas
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Warning alerts (collapsed) */}
      {warningAlerts.length > 0 && criticalAlerts.length === 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                {warningAlerts.length} warning{warningAlerts.length > 1 ? 's' : ''} detectado{warningAlerts.length > 1 ? 's' : ''}
              </span>
            </div>
            <Link href="/alerts" className="text-xs font-medium text-yellow-500 hover:underline">
              Ver detalles
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SiteHealthGrid sites={sites} />
        </div>
        <div className="space-y-6">
          <QuickStats
            pendingFixes={pendingFixes}
            pendingContent={pendingContent}
            totalKeywords={totalKeywords}
            totalBacklinks={totalBacklinks}
          />
        </div>
      </div>

      <RecentActivity logs={recentActivity} />
    </div>
  )
}
