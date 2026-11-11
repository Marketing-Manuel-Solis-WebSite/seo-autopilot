import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MonthlyReportData, ResultadosData, ResultadosMonth } from '@/lib/resultados/types'
import { monthLong, monthShort } from '@/lib/resultados/types'
import {
  ContactsStacked,
  DailyClicks,
  LegendRow,
  MonthlyColumns,
  OrganicSessions,
  WorkShipped,
} from '@/components/resultados/ResultadosCharts'
import { fmt, pctChange, signedPct, StatTile } from '@/components/resultados/Stats'

export const dynamic = 'force-dynamic'

function ChartCard({
  title,
  subtitle,
  children,
  legend,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  legend?: { label: string; color: string }[]
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {legend && <div className="pt-1"><LegendRow items={legend} /></div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function QuickLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link href={href} className="group block rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      <p className="mt-2 text-xs font-medium text-primary group-hover:underline">Abrir →</p>
    </Link>
  )
}

function dayLabel(date?: string) {
  if (!date) return ''
  return `${Number(date.slice(8, 10))} ${monthShort(date)}`
}

function cell(n: number | undefined | null, suffix = '') {
  return typeof n === 'number' ? `${fmt(n)}${suffix}` : '—'
}

export default async function ResultadosPage() {
  const [report, monthly, analysis, weeklyCount, latestWeek, auditCount, keywordCount, contentCount, locationCount] = await Promise.all([
    prisma.report.findFirst({ where: { reportType: 'resultados_seo' }, orderBy: { generatedAt: 'desc' } }),
    prisma.report.findMany({ where: { reportType: 'mensual_seo' }, orderBy: { period: 'asc' } }),
    prisma.report.findFirst({ where: { reportType: 'analisis_busqueda' }, orderBy: { generatedAt: 'desc' }, select: { id: true } }),
    prisma.report.count({ where: { reportType: 'semanal_seo' } }),
    prisma.report.findFirst({ where: { reportType: 'semanal_seo' }, orderBy: { period: 'desc' }, select: { id: true, title: true } }),
    prisma.audit.count(),
    prisma.keyword.count(),
    prisma.content.count({ where: { status: 'published' } }),
    prisma.location.count(),
  ])

  if (!report) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Resultados SEO" description="Todavía no hay resultados para este sitio." />
      </div>
    )
  }

  const data = report.data as unknown as ResultadosData
  const months = data.months
  const fullGsc = months.filter(m => !m.partial?.gsc)
  const base = months[0]
  const latest = fullGsc[fullGsc.length - 1]
  const current = months[months.length - 1]
  const recordMonth = fullGsc.reduce((a, b) => (b.gscImpressions > a.gscImpressions ? b : a))
  const lastOrganic = [...months].reverse().find(m => typeof m.ga4OrganicWww === 'number') as ResultadosMonth
  const lastUrls = [...months].reverse().find(m => typeof m.urlsWithImpressions === 'number') as ResultadosMonth
  const contactsLatest = data.contacts.find(c => c.month === latest.month)
  const contactsPrev = data.contacts.find(c => c.month < latest.month && c.days >= 28)
  const contactsTotal = (c?: { phone: number; whatsapp: number; consulta: number; form: number }) =>
    c ? c.phone + c.whatsapp + c.consulta + c.form : 0

  const impressionsMultiple = latest.gscImpressions / base.gscImpressions
  const totalPosts = months.reduce((s, m) => s + m.postsPublished, 0)
  const totalPages = months.reduce((s, m) => s + m.newPages, 0)
  const totalCommits = months.reduce((s, m) => s + m.commits, 0)
  const totalAgent = months.reduce((s, m) => s + (m.agentCommits ?? 0), 0)
  const periodLabel = `${monthLong(base.month)} – ${monthLong(current.month)} ${current.month.slice(0, 4)}`

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Resultados SEO"
        description={`${data.site} · ${periodLabel} · Search Console y GA4 · actualizado el ${data.updatedAt}`}
      />

      {/* Hero: the one number this view leads with */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Impresiones en Google en {monthLong(latest.month)}</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight">{fmt(latest.gscImpressions)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {impressionsMultiple >= 2 ? (
                <>
                  <span className="font-medium text-foreground">{fmt(Math.round(impressionsMultiple * 10) / 10)} veces</span> las de{' '}
                  {monthLong(base.month)} ({fmt(base.gscImpressions)})
                </>
              ) : (
                <>contra {fmt(base.gscImpressions)} en {monthLong(base.month)}</>
              )}
              {recordMonth.month === latest.month && ' · el mejor mes del periodo'}
            </p>
          </div>
          <div className="text-sm lg:text-right">
            <p className="mb-2 text-xs text-muted-foreground">
              Trabajo en el sitio, {monthShort(base.month)} – {monthShort(current.month)}
            </p>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div>
                <p className="text-xl font-semibold">{fmt(totalPosts)}</p>
                <p className="text-xs text-muted-foreground">posts publicados</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{fmt(totalPages)}</p>
                <p className="text-xs text-muted-foreground">páginas nuevas</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{fmt(totalCommits)}</p>
                <p className="text-xs text-muted-foreground">cambios al sitio</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{fmt(totalAgent)}</p>
                <p className="text-xs text-muted-foreground">hechos por el agente de IA</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={`Clics desde Google · ${monthShort(latest.month)}`}
          value={fmt(latest.gscClicks)}
          delta={pctChange(latest.gscClicks, base.gscClicks)}
          deltaSuffix={`vs ${monthShort(base.month)} (${fmt(base.gscClicks)})`}
        />
        <StatTile
          label={`Sesiones orgánicas en www · ${monthShort(lastOrganic.month)}`}
          value={fmt(lastOrganic.ga4OrganicWww ?? 0)}
          note={lastOrganic.partial?.ga4 ? `parcial: ${lastOrganic.partial.ga4}` : undefined}
          delta={pctChange(lastOrganic.ga4OrganicWww, base.ga4OrganicWww)}
          deltaSuffix={`vs ${monthShort(base.month)} (${fmt(base.ga4OrganicWww ?? 0)})`}
        />
        <StatTile
          label={`Páginas que aparecen en Google · ${monthShort(lastUrls.month)}`}
          value={fmt(lastUrls.urlsWithImpressions ?? 0)}
          note={lastUrls.partial?.urls ? `parcial: ${lastUrls.partial.urls}` : undefined}
          delta={pctChange(lastUrls.urlsWithImpressions, base.urlsWithImpressions)}
          deltaSuffix={`vs ${monthShort(base.month)} (${fmt(base.urlsWithImpressions ?? 0)})`}
        />
        <StatTile
          label={`Contactos medidos · ${monthShort(latest.month)}`}
          value={fmt(contactsTotal(contactsLatest))}
          note="llamada, WhatsApp, consulta y formulario"
          delta={contactsPrev ? pctChange(contactsTotal(contactsLatest), contactsTotal(contactsPrev)) : null}
          deltaSuffix={contactsPrev ? `vs ${monthShort(contactsPrev.month)} (${fmt(contactsTotal(contactsPrev))})` : ''}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analysis && (
          <QuickLink href={`/reports/${analysis.id}`} title="Análisis de búsqueda y audiencia" detail="Búsquedas, páginas, oportunidades, países, dispositivos y canales" />
        )}
        {latestWeek && (
          <QuickLink href="/reports" title={`${weeklyCount} reportes semanales`} detail={`De marzo a noviembre · el más reciente: ${latestWeek.title.replace('Reporte semanal SEO — ', '')}`} />
        )}
        <QuickLink href="/sites/site_manuelsolis/audit" title={`${auditCount} auditorías SEO`} detail="Técnicas, de cobertura, analítica y completas, con acciones" />
        <QuickLink
          href="/sites/site_manuelsolis"
          title="Datos del sitio"
          detail={`${fmt(keywordCount)} búsquedas de Google · ${fmt(contentCount)} páginas publicadas · ${fmt(locationCount)} oficinas`}
        />
      </div>

      {monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Justificación mes por mes</CardTitle>
            <p className="text-xs text-muted-foreground">
              Qué se hizo cada mes, qué parte hizo el agente de IA y qué cambió en Google. Abre cada mes para ver el reporte completo.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {monthly.map(r => {
                const m = r.data as unknown as MonthlyReportData
                const d = pctChange(m.metrics.gscImpressions, m.previous.gscImpressions)
                const partial = Boolean(m.metrics.partial?.gsc)
                return (
                  <Link
                    key={r.id}
                    href={`/reports/${r.id}`}
                    className="group rounded-lg border p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {monthLong(m.month)} {m.month.slice(0, 4)}
                      </p>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        agente {fmt(m.agent.agentCommits)}/{fmt(m.agent.commits)}
                      </span>
                    </div>
                    {m.highlights?.[0] && (
                      <p className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-semibold tracking-tight">{m.highlights[0].value}</span>
                        <span className="text-xs text-muted-foreground">{m.highlights[0].label}</span>
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-snug">{m.headline}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {partial
                        ? `En curso: ${fmt(m.metrics.gscClicks ?? 0)} clics (${m.metrics.partial?.gsc})`
                        : `${fmt(m.metrics.gscImpressions ?? 0)} impresiones${
                            d !== null ? ` · ${signedPct(d)} vs ${monthShort(m.previous.month)}` : ''
                          }`}
                    </p>
                    <p className="mt-2 text-xs font-medium text-primary group-hover:underline">Ver reporte →</p>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Impresiones en Google por mes" subtitle={`${monthShort(base.month)} – ${monthShort(latest.month)} · Search Console`}>
          <MonthlyColumns months={fullGsc} metric="gscImpressions" label="Impresiones" />
        </ChartCard>
        <ChartCard title="Clics desde Google por mes" subtitle={`${monthShort(base.month)} – ${monthShort(latest.month)} · Search Console`}>
          <MonthlyColumns months={fullGsc} metric="gscClicks" label="Clics" />
        </ChartCard>
      </div>

      <ChartCard
        title="Clics diarios desde Google"
        subtitle={`${dayLabel(data.daily[0]?.date)} – ${dayLabel(data.daily[data.daily.length - 1]?.date)}${
          current.partial?.gsc
            ? ` · ${monthLong(current.month)} hasta ahora (${current.partial.gsc}): ${fmt(current.gscClicks)} clics y ${fmt(current.gscImpressions)} impresiones`
            : ''
        }`}
      >
        <DailyClicks daily={data.daily} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Sesiones orgánicas en www.manuelsolis.com"
          subtitle={`GA4, búsqueda orgánica · ${monthShort(lastOrganic.month)} ${lastOrganic.partial?.ga4 ? `parcial (${lastOrganic.partial.ga4})` : ''}`}
        >
          <OrganicSessions months={months} />
        </ChartCard>
        <ChartCard
          title="Contactos medidos en el sitio"
          subtitle="GA4, todos los canales · desde que se miden los cuatro eventos"
          legend={[
            { label: 'Llamada', color: 'var(--series-1)' },
            { label: 'WhatsApp', color: 'var(--series-2)' },
            { label: 'Consulta', color: 'var(--series-3)' },
            { label: 'Formulario', color: 'var(--series-4)' },
          ]}
        >
          <ContactsStacked contacts={data.contacts} />
        </ChartCard>
      </div>

      <ChartCard
        title="Páginas nuevas en el sitio por mes"
        subtitle="Repositorio del sitio · incluye posts, landings y oficinas; posts, commits y aporte del agente en el tooltip y en la tabla"
      >
        <WorkShipped months={months} />
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tabla mensual</CardTitle>
          <p className="text-xs text-muted-foreground">* mes parcial; el rango aparece debajo de la cifra.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Mes</th>
                  <th className="py-2 pr-3 text-right font-medium">Clics</th>
                  <th className="py-2 pr-3 text-right font-medium">Impresiones</th>
                  <th className="py-2 pr-3 text-right font-medium">CTR</th>
                  <th className="py-2 pr-3 text-right font-medium">Posición</th>
                  <th className="py-2 pr-3 text-right font-medium">Páginas en Google</th>
                  <th className="py-2 pr-3 text-right font-medium">Sesiones orgánicas</th>
                  <th className="py-2 pr-3 text-right font-medium">Interacción</th>
                  <th className="py-2 pr-3 text-right font-medium">Posts</th>
                  <th className="py-2 pr-3 text-right font-medium">Páginas nuevas</th>
                  <th className="py-2 pr-3 text-right font-medium">Commits</th>
                  <th className="py-2 text-right font-medium">Del agente</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {months.map(m => (
                  <tr key={m.month} className="border-b last:border-0">
                    <td className="py-2 pr-3 capitalize">{monthLong(m.month)}</td>
                    <td className="py-2 pr-3 text-right">
                      {cell(m.gscClicks)}{m.partial?.gsc ? '*' : ''}
                      {m.partial?.gsc && <span className="block text-[10px] text-muted-foreground">{m.partial.gsc}</span>}
                    </td>
                    <td className="py-2 pr-3 text-right">{cell(m.gscImpressions)}{m.partial?.gsc ? '*' : ''}</td>
                    <td className="py-2 pr-3 text-right">{cell(m.gscCtr, ' %')}</td>
                    <td className="py-2 pr-3 text-right">{cell(m.gscPosition)}</td>
                    <td className="py-2 pr-3 text-right">
                      {cell(m.urlsWithImpressions)}{m.partial?.urls && typeof m.urlsWithImpressions === 'number' ? '*' : ''}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {cell(m.ga4OrganicWww)}{m.partial?.ga4 && typeof m.ga4OrganicWww === 'number' ? '*' : ''}
                      {m.partial?.ga4 && typeof m.ga4OrganicWww === 'number' && (
                        <span className="block text-[10px] text-muted-foreground">{m.partial.ga4}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">{cell(m.engagementWww ?? undefined, ' %')}</td>
                    <td className="py-2 pr-3 text-right">
                      {fmt(m.postsPublished)}
                      {m.postsScheduled ? <span className="block text-[10px] text-muted-foreground">+{m.postsScheduled} programados</span> : null}
                    </td>
                    <td className="py-2 pr-3 text-right">{fmt(m.newPages)}</td>
                    <td className="py-2 pr-3 text-right">{fmt(m.commits)}</td>
                    <td className="py-2 text-right">{cell(m.agentCommits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1 pb-4 text-xs text-muted-foreground">
        {data.sources.map(s => (
          <p key={s}>{s}</p>
        ))}
      </div>
    </div>
  )
}
