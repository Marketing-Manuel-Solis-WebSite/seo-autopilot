import { prisma } from '@/lib/prisma'
import PageHeader from '@/components/layout/PageHeader'
import EditorialCalendar from '@/components/content/EditorialCalendar'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const items = await prisma.content.findMany({
    where: { status: { in: ['draft', 'pending_approval', 'approved'] } },
    orderBy: { createdAt: 'asc' },
    include: { site: { select: { name: true } } },
    take: 50,
  })

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Calendario Editorial" description="Plan de contenido por semana" />
      <EditorialCalendar items={items} />
    </div>
  )
}
