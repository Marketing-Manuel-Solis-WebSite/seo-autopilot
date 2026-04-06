import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import AuditReport from '@/components/sites/AuditReport'

export const dynamic = 'force-dynamic'

export default async function AuditPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params

  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) notFound()

  const audits = await prisma.audit.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`Auditoría — ${site.name}`} description={`Historial de auditorías de ${site.domain}`} />
      <div className="space-y-4">
        {audits.map(audit => (
          <AuditReport key={audit.id} audit={audit} />
        ))}
        {audits.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay auditorías aún</p>
        )}
      </div>
    </div>
  )
}
