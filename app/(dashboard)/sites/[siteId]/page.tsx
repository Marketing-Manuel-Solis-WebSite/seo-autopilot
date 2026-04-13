import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import AuditReport from '@/components/sites/AuditReport'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import AuditScoreGauge from '@/components/charts/AuditScoreGauge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      audits: { orderBy: { createdAt: 'desc' }, take: 1 },
      alerts: { where: { isRead: false }, take: 5 },
      fixes: { where: { status: 'pending_approval' }, take: 5 },
      _count: { select: { keywords: true, content: true, backlinks: true, rankings: true } },
    },
  })

  if (!site) notFound()

  const latestAudit = site.audits[0]
  const score = latestAudit?.score ?? 0

  const tabs = [
    { href: `/sites/${siteId}/audit`, label: 'Auditoría' },
    { href: `/sites/${siteId}/keywords`, label: 'Keywords' },
    { href: `/sites/${siteId}/content`, label: 'Contenido' },
    { href: `/sites/${siteId}/backlinks`, label: 'Backlinks' },
    { href: `/sites/${siteId}/competitors`, label: 'Competencia' },
    { href: `/sites/${siteId}/local`, label: 'Local SEO' },
  ]

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={site.name} description={site.domain}>
        <Badge variant="outline" className="font-mono">{site.cmsType ?? 'custom'}</Badge>
      </PageHeader>

      <div className="flex gap-2">
        {tabs.map(tab => (
          <Link key={tab.href} href={tab.href}>
            <Badge variant="secondary" className="cursor-pointer hover:bg-accent">{tab.label}</Badge>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-center pt-6">
            <AuditScoreGauge score={score} label="SEO Score" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Keywords</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold font-mono">{site._count.keywords}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Backlinks</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold font-mono">{site._count.backlinks}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Contenido</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold font-mono">{site._count.content}</p></CardContent>
        </Card>
      </div>

      {latestAudit && <AuditReport audit={latestAudit} />}

      {site.alerts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Alertas activas</CardTitle></CardHeader>
          <CardContent>
            {site.alerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between border-b py-2 last:border-0">
                <div>
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="mr-2 text-xs">{alert.severity}</Badge>
                  <span className="text-sm">{alert.title}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
