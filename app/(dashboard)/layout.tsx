import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  } catch (err) {
    console.error('[DashboardLayout] Failed to load layout data:', err)
    return { alertCount: 0, fixCount: 0, systemStatus: 'ok' as const }
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Auth check — redirect to login if no valid session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

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
