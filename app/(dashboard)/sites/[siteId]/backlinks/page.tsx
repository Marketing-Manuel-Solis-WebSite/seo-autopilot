import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import BacklinkTable from '@/components/sites/BacklinkTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function BacklinksPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params

  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) notFound()

  const backlinks = await prisma.backlink.findMany({
    where: { siteId, isActive: true },
    orderBy: { domainAuthority: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`Backlinks — ${site.name}`} description={`${backlinks.length} backlinks activos`} />
      <Card>
        <CardHeader><CardTitle className="text-base">Backlinks</CardTitle></CardHeader>
        <CardContent>
          <BacklinkTable backlinks={backlinks} />
        </CardContent>
      </Card>
    </div>
  )
}
