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
    orderBy: { searchVolume: 'desc' },
  })

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`Keywords — ${site.name}`} description={`${keywords.length} keywords rastreadas`} />
      <Card>
        <CardHeader><CardTitle className="text-base">Keywords y rankings</CardTitle></CardHeader>
        <CardContent>
          <KeywordTable keywords={keywords} />
        </CardContent>
      </Card>
    </div>
  )
}
