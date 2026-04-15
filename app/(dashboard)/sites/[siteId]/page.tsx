import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import AuditReport from '@/components/sites/AuditReport'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import AuditScoreGauge from '@/components/charts/AuditScoreGauge'
import Link from 'next/link'
import {
  ClipboardCheck,
  Search,
  FileText,
  Link2,
  Users,
  MapPin,
  TrendingUp,
  TrendingDown,
  Target,
} from 'lucide-react'

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

  // Get recent ranking trends
  const recentRankings = await prisma.ranking.findMany({
    where: { siteId, change: { not: null } },
    orderBy: { checkedAt: 'desc' },
    take: 50,
  })
  const rankingUp = recentRankings.filter(r => (r.change ?? 0) > 0).length
  const rankingDown = recentRankings.filter(r => (r.change ?? 0) < 0).length

  const tabs = [
    { href: `/sites/${siteId}/audit`, label: 'Auditoria', icon: ClipboardCheck },
    { href: `/sites/${siteId}/keywords`, label: 'Keywords', icon: Search },
    { href: `/sites/${siteId}/content`, label: 'Contenido', icon: FileText },
    { href: `/sites/${siteId}/backlinks`, label: 'Backlinks', icon: Link2 },
    { href: `/sites/${siteId}/competitors`, label: 'Competencia', icon: Users },
    { href: `/sites/${siteId}/local`, label: 'Local SEO', icon: MapPin },
  ]

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={site.name} description={site.domain}>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">{site.cmsType ?? 'custom'}</Badge>
          <Badge variant="outline" className="font-mono text-xs">{site.targetCountry?.toUpperCase() ?? 'US'}</Badge>
        </div>
      </PageHeader>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground hover:shadow-sm"
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center justify-center py-6">
            <AuditScoreGauge score={score} label="SEO Score" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-xs">Keywords</span>
            </div>
            <p className="mt-1 text-3xl font-bold font-mono">{site._count.keywords.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Link2 className="h-4 w-4" />
              <span className="text-xs">Backlinks</span>
            </div>
            <p className="mt-1 text-3xl font-bold font-mono">{site._count.backlinks.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-xs">Contenido</span>
            </div>
            <p className="mt-1 text-3xl font-bold font-mono">{site._count.content.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-green-500">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{rankingUp}</span>
              </div>
              <div className="flex items-center gap-1 text-red-500">
                <TrendingDown className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{rankingDown}</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Ranking trends</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit report */}
      {latestAudit && <AuditReport audit={latestAudit} />}

      {/* Active alerts */}
      {site.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Alertas activas
              <Badge variant="destructive" className="text-xs">{site.alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {site.alerts.map(alert => (
              <div key={alert.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className={`h-2 w-2 shrink-0 rounded-full ${alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{alert.title}</p>
                  {alert.message && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
                  )}
                </div>
                <Badge
                  variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                  className="text-[10px]"
                >
                  {alert.severity}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
