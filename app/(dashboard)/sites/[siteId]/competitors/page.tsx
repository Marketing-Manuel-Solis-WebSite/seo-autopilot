import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import CompetitorMatrix from '@/components/sites/CompetitorMatrix'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function CompetitorsPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params

  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) notFound()

  const competitors = await prisma.competitor.findMany({
    where: { siteId },
    orderBy: { visibilityScore: 'desc' },
  })

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`Competencia — ${site.name}`} description={`${competitors.length} competidores analizados`} />
      <Card>
        <CardHeader><CardTitle className="text-base">Matriz de competidores</CardTitle></CardHeader>
        <CardContent>
          <CompetitorMatrix competitors={competitors} />
        </CardContent>
      </Card>
    </div>
  )
}
