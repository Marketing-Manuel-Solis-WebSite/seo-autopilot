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
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { isGSCConfigured } from '@/lib/gsc/client'
import { getLiveGscSummary, getRepoActivity, repoForDomain } from '@/lib/sites/connections'
import type { ResultadosData } from '@/lib/resultados/types'
import { monthLong } from '@/lib/resultados/types'
import { fmt, pctChange, StatTile } from '@/components/resultados/Stats'

export const dynamic = 'force-dynamic'

function ConnectionRow({
  ok,
  title,
  detail,
  href,
  hrefLabel,
}: {
  ok: boolean
  title: string
  detail: string
  href?: string
  hrefLabel?: string
}) {
  const Icon = ok ? CheckCircle2 : Circle
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ok ? '#0ca30c' : 'var(--muted-foreground)' }} aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="break-words text-xs text-muted-foreground">{detail}</p>
        {href && hrefLabel && (
          <a href={href} className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
            {hrefLabel} →
          </a>
        )}
      </div>
    </div>
  )
}

function LiveStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

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

  // Connections: repository (read-only, live), Search Console (live once authorized), loaded results
  const repo = repoForDomain(site.domain)
  const [repoActivity, liveGsc, latestMonthly, resultsCount, overview] = await Promise.all([
    repo ? getRepoActivity(repo) : Promise.resolve(null),
    getLiveGscSummary(site),
    prisma.report.findFirst({ where: { siteId, reportType: 'mensual_seo' }, orderBy: { period: 'desc' } }),
    prisma.report.count({ where: { siteId, reportType: { in: ['resultados_seo', 'mensual_seo'] } } }),
    prisma.report.findFirst({ where: { siteId, reportType: 'resultados_seo' }, orderBy: { generatedAt: 'desc' } }),
  ])
  const gscConnected = isGSCConfigured(site)
  // Without an audit, show the site's real results instead of an empty "SEO score 0"
  const results = overview?.data as unknown as ResultadosData | undefined
  const fullMonths = results?.months.filter(m => !m.partial?.gsc) ?? []
  const lastFull = fullMonths[fullMonths.length - 1]
  const firstMonth = results?.months[0]
  const lastContacts = results?.contacts.find(c => c.month === lastFull?.month)

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

      {/* Connections */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Conexiones del sitio
              {(repo || gscConnected || resultsCount > 0) && (
                <Badge className="bg-green-500/10 text-green-500">Conectado</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ConnectionRow
              ok={Boolean(repoActivity?.ok)}
              title="Repositorio del sitio"
              detail={
                repoActivity?.ok
                  ? `${repo} · solo lectura · último cambio ${repoActivity.commits[0] ? new Date(repoActivity.commits[0].date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}`
                  : repo
                    ? `${repo} · ${repoActivity && !repoActivity.ok ? repoActivity.reason : 'sin acceso'}`
                    : 'Sin repositorio vinculado'
              }
            />
            <ConnectionRow
              ok={resultsCount > 0}
              title="Search Console y GA4 · datos cargados"
              detail={resultsCount > 0 ? `${resultsCount} reportes (marzo a noviembre 2026)` : 'Sin datos cargados'}
              href={resultsCount > 0 ? '/resultados' : undefined}
              hrefLabel="Ver resultados"
            />
            <ConnectionRow
              ok={gscConnected}
              title="Search Console en vivo"
              detail={gscConnected ? `${site.gscPropertyUrl}` : 'Falta autorizar con la cuenta de Google que administra el sitio'}
              href={gscConnected ? undefined : `/api/auth/gsc?siteId=${site.id}`}
              hrefLabel="Conectar Search Console"
            />
            <ConnectionRow
              ok={site.isActive}
              title="Monitoreo automático"
              detail={site.isActive ? 'Activo: los crons analizan el sitio' : 'En pausa: los crons no gastan en APIs ni hacen cambios en el sitio'}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Actividad reciente en el sitio
              {repoActivity?.ok && <span className="text-xs font-normal text-muted-foreground">en vivo desde GitHub</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveGsc && 'clicks' in liveGsc && (
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-4">
                <LiveStat label="Clics · 28 días" value={liveGsc.clicks.toLocaleString('es-MX')} />
                <LiveStat label="Impresiones" value={liveGsc.impressions.toLocaleString('es-MX')} />
                <LiveStat label="CTR" value={`${liveGsc.ctr.toFixed(2)} %`} />
                <LiveStat label="Posición media" value={liveGsc.position.toFixed(1)} />
              </div>
            )}
            {liveGsc && 'error' in liveGsc && (
              <p className="mb-4 text-xs text-muted-foreground">Search Console en vivo no respondió: {liveGsc.error}</p>
            )}
            {repoActivity?.ok ? (
              <ul className="divide-y">
                {repoActivity.commits.map(c => (
                  <li key={c.sha} className="flex items-start justify-between gap-3 py-2">
                    <a href={c.url} target="_blank" rel="noreferrer" className="min-w-0 text-sm hover:underline">
                      <span className="line-clamp-1">{c.message}</span>
                    </a>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {c.agent && <Badge variant="outline" className="text-[10px]">agente IA</Badge>}
                      {new Date(c.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No se pudo leer el repositorio del sitio.</p>
            )}
            {latestMonthly && (
              <Link href={`/reports/${latestMonthly.id}`} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
                Ver el reporte mensual más reciente →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {!latestAudit && lastFull && firstMonth && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Resultados en Google · {monthLong(lastFull.month)} {lastFull.month.slice(0, 4)}</h2>
            <Link href="/resultados" className="text-xs font-medium text-primary hover:underline">Ver tablero completo →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Impresiones en Google"
              value={fmt(lastFull.gscImpressions)}
              delta={pctChange(lastFull.gscImpressions, firstMonth.gscImpressions)}
              deltaSuffix={`vs ${monthLong(firstMonth.month)} (${fmt(firstMonth.gscImpressions)})`}
            />
            <StatTile
              label="Clics desde Google"
              value={fmt(lastFull.gscClicks)}
              delta={pctChange(lastFull.gscClicks, firstMonth.gscClicks)}
              deltaSuffix={`vs ${monthLong(firstMonth.month)} (${fmt(firstMonth.gscClicks)})`}
            />
            <StatTile
              label="Páginas que aparecen en Google"
              value={fmt(lastFull.urlsWithImpressions ?? 0)}
              note={lastFull.partial?.urls ? `parcial: ${lastFull.partial.urls}` : undefined}
              delta={pctChange(lastFull.urlsWithImpressions, firstMonth.urlsWithImpressions)}
              deltaSuffix={`vs ${monthLong(firstMonth.month)} (${fmt(firstMonth.urlsWithImpressions ?? 0)})`}
            />
            <StatTile
              label="Contactos medidos (GA4)"
              value={fmt(lastContacts ? lastContacts.phone + lastContacts.whatsapp + lastContacts.consulta + lastContacts.form : 0)}
              note="llamada, WhatsApp, consulta y formulario"
              delta={null}
              deltaSuffix=""
            />
          </div>
        </div>
      )}

      {/* Stats grid (from the Autopilot's own audits) */}
      {latestAudit && (
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
      )}

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
