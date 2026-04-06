import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import ContentCard from '@/components/content/ContentCard'

export const dynamic = 'force-dynamic'

export default async function SiteContentPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params

  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) notFound()

  const content = await prisma.content.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`Contenido — ${site.name}`} description={`${content.length} piezas de contenido`} />
      <div className="grid gap-4 sm:grid-cols-2">
        {content.map(c => (
          <ContentCard key={c.id} content={c} />
        ))}
        {content.length === 0 && (
          <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">Sin contenido generado aún</p>
        )}
      </div>
    </div>
  )
}
