import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'

export const dynamic = 'force-dynamic'

async function getLayoutData() {
  try {
    const [alertCount, fixCount] = await Promise.all([
      prisma.alert.count({ where: { isRead: false } }),
      prisma.fix.count({ where: { status: 'pending_approval' } }),
    ])

    const criticalAlerts = await prisma.alert.count({
      where: { isRead: false, severity: 'critical' },
    })

    const systemStatus = criticalAlerts > 0 ? 'critical' : alertCount > 5 ? 'warning' : 'ok'

    return { alertCount, fixCount, systemStatus: systemStatus as 'ok' | 'warning' | 'critical' }
  } catch {
    return { alertCount: 0, fixCount: 0, systemStatus: 'ok' as const }
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { alertCount, fixCount, systemStatus } = await getLayoutData()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar alertCount={alertCount} fixCount={fixCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav systemStatus={systemStatus} alertCount={alertCount} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
