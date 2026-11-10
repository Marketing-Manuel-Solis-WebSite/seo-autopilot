import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import KeywordTable from '@/components/sites/KeywordTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function KeywordsPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params

  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) notFound()

  const keywords = await prisma.keyword.findMany({
    where: { siteId, isTracking: true },
    include: { rankings: { orderBy: { checkedAt: 'desc' }, take: 1 } },
    orderBy: [{ gscClicks: { sort: 'desc', nulls: 'last' } }, { gscImpressions: { sort: 'desc', nulls: 'last' } }],
  })

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`Keywords — ${site.name}`} description={`${keywords.length} búsquedas de Google con clics o impresiones · Search Console, 12 meses al 25 oct 2026 y últimos 3 meses`} />
      <Card>
        <CardHeader><CardTitle className="text-base">Búsquedas y posiciones</CardTitle><p className="text-xs text-muted-foreground">Posición media de los últimos 3 meses; el cambio compara contra el promedio de 12 meses.</p></CardHeader>
        <CardContent>
          <KeywordTable keywords={keywords} />
        </CardContent>
      </Card>
    </div>
  )
}
