import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MonthlyReportData, ResultadosContacts, ResultadosData, SearchAnalysisData, WeeklyReportData } from '@/lib/resultados/types'
import WeeklyReportView from '@/components/resultados/WeeklyReportView'
import SearchAnalysisView from '@/components/resultados/SearchAnalysisView'
import { monthLong } from '@/lib/resultados/types'
import { fmt, pctChange, ShareMeter, StatTile } from '@/components/resultados/Stats'
import { formatDate } from '@/lib/utils/helpers'

export const dynamic = 'force-dynamic'

function dateShort(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function UploadTable({
  title,
  totals,
  rows,
}: {
  title: string
  totals: string
  rows: { key: string; name: string; url: string; meta: string; clicks: number; impressions: number }[]
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{totals}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Página</th>
              <th className="py-2 pr-3 font-medium">Detalle</th>
              <th className="py-2 pr-3 text-right font-medium">Clics</th>
              <th className="py-2 text-right font-medium">Impresiones</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map(r => (
              <tr key={r.key} className="border-b last:border-0">
                <td className="py-2 pr-3">
                  <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">{r.name}</a>
                </td>
                <td className="whitespace-nowrap py-2 pr-3 text-xs text-muted-foreground">{r.meta}</td>
                <td className="py-2 pr-3 text-right">{r.clicks ? fmt(r.clicks) : '—'}</td>
                <td className="py-2 text-right">{r.impressions ? fmt(r.impressions) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MonthlyReportView({
  data,
  prevId,
  nextId,
  prevContacts,
}: {
  data: MonthlyReportData
  prevId?: string
  nextId?: string
  prevContacts?: ResultadosContacts | null
}) {
  const m = data.metrics
  const p = data.previous
  const prevName = monthLong(p.month)
  const partial = m.partial?.gsc
  const contacts = data.contacts
  const contactsTotal = contacts ? contacts.phone + contacts.whatsapp + contacts.consulta + contacts.form : null
  const suffix = partial ? `ritmo vs ${prevName}` : `vs ${prevName}`
  // For a partial month compare per-day rates, not raw totals
  const days = m.gscDays ?? 30
  const prevDays = p.month.endsWith('-02') ? 28 : ['04', '06', '09', '11'].includes(p.month.slice(5, 7)) ? 30 : 31
  const rate = (v?: number | null, d = days) => (typeof v === 'number' ? v / d : null)
  const clicksDelta = partial ? pctChange(rate(m.gscClicks), rate(p.gscClicks, prevDays)) : pctChange(m.gscClicks, p.gscClicks)
  const imprDelta = partial ? pctChange(rate(m.gscImpressions), rate(p.gscImpressions, prevDays)) : pctChange(m.gscImpressions, p.gscImpressions)
  const posDiff = typeof m.gscPosition === 'number' && typeof p.gscPosition === 'number' ? Math.round((m.gscPosition - p.gscPosition) * 10) / 10 : null
  // GA4 windows like "1–27 oct": compare per-day rate against the previous full month
  const ga4Days = Number(m.partial?.ga4?.match(/–(\d+)/)?.[1] ?? 0) || null
  const organicDelta = ga4Days
    ? pctChange(rate(m.ga4OrganicWww, ga4Days), rate(p.ga4OrganicWww, prevDays))
    : pctChange(m.ga4OrganicWww, p.ga4OrganicWww)
  const prevContactsTotal = prevContacts ? prevContacts.phone + prevContacts.whatsapp + prevContacts.consulta + prevContacts.form : null
  const contactsDelta =
    contacts && prevContactsTotal !== null && contactsTotal !== null
      ? contacts.days < 28
        ? pctChange(contactsTotal / contacts.days, prevContactsTotal / prevContacts!.days)
        : pctChange(contactsTotal, prevContactsTotal)
      : null

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/reports" className="text-muted-foreground hover:text-foreground">← Reportes</Link>
        <div className="flex items-center gap-4">
          {prevId ? (
            <Link href={`/reports/${prevId}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Mes anterior
            </Link>
          ) : null}
          {nextId ? (
            <Link href={`/reports/${nextId}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              Mes siguiente <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>

      <PageHeader
        title={`Reporte mensual SEO · ${monthLong(data.month)} ${data.month.slice(0, 4)}`}
        description={`${data.site} · comparado con ${prevName} · actualizado el ${data.updatedAt}`}
      >
        {partial && <Badge variant="outline">En curso · {partial}</Badge>}
      </PageHeader>

      <Card>
        <CardContent className="py-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Justificación del mes</p>
          <p className="mt-2 text-xl font-semibold leading-snug tracking-tight">{data.headline}</p>
          {data.note && <p className="mt-2 text-sm text-muted-foreground">{data.note}</p>}
        </CardContent>
      </Card>

      {data.highlights && data.highlights.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {data.highlights.map(h => (
            <Card key={h.label} className="bg-gradient-to-b from-primary/10 to-transparent">
              <CardContent className="py-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Lo más destacado</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight">{h.value}</p>
                <p className="mt-1 text-sm font-medium">{h.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{h.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Impresiones en Google"
          value={fmt(m.gscImpressions ?? 0)}
          note={partial ? `parcial: ${partial}` : undefined}
          delta={imprDelta}
          deltaSuffix={`${suffix} (${fmt(p.gscImpressions ?? 0)})`}
        />
        <StatTile
          label="Clics desde Google"
          value={fmt(m.gscClicks ?? 0)}
          note={partial ? `parcial: ${partial}` : undefined}
          delta={clicksDelta}
          deltaSuffix={`${suffix} (${fmt(p.gscClicks ?? 0)})`}
        />
        {typeof m.urlsWithImpressions === 'number' && (
          <StatTile
            label="Páginas que aparecen en Google"
            value={fmt(m.urlsWithImpressions)}
            note={
              m.partial?.urls
                ? `parcial: ${m.partial.urls} · no comparable con un mes completo (${prevName}: ${fmt(p.urlsWithImpressions ?? 0)})`
                : undefined
            }
            delta={m.partial?.urls ? null : pctChange(m.urlsWithImpressions, p.urlsWithImpressions)}
            deltaSuffix={`vs ${prevName} (${fmt(p.urlsWithImpressions ?? 0)})`}
          />
        )}
        {typeof m.ga4OrganicWww === 'number' && (
          <StatTile
            label="Sesiones orgánicas en www"
            value={fmt(m.ga4OrganicWww)}
            note={m.partial?.ga4 ? `parcial: ${m.partial.ga4}` : undefined}
            delta={organicDelta}
            deltaSuffix={`${ga4Days ? 'ritmo diario ' : ''}vs ${prevName} (${fmt(p.ga4OrganicWww ?? 0)})`}
          />
        )}
        {typeof m.gscPosition === 'number' && posDiff !== null && (
          <StatTile
            label="Posición media en Google"
            value={fmt(m.gscPosition)}
            note="más bajo es mejor"
            delta={posDiff === 0 ? 0 : (posDiff / (p.gscPosition as number)) * 100}
            absolute={posDiff}
            lowerIsBetter
            deltaSuffix={`vs ${prevName} (${fmt(p.gscPosition as number)})`}
          />
        )}
        {contactsTotal !== null && contacts && (
          <StatTile
            label="Contactos medidos (GA4)"
            value={fmt(contactsTotal)}
            note={`llamada ${fmt(contacts.phone)} · WhatsApp ${fmt(contacts.whatsapp)} · consulta ${fmt(contacts.consulta)} · formulario ${fmt(contacts.form)}${contacts.days < 28 ? ` · al ${Number(contacts.through.slice(8, 10))}` : ''}`}
            delta={contactsDelta}
            deltaSuffix={
              prevContactsTotal !== null
                ? `${contacts.days < 28 ? 'ritmo diario ' : ''}vs ${monthLong(prevContacts!.month)} (${fmt(prevContactsTotal)})`
                : ''
            }
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Qué se hizo para mejorar el SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {data.work.map(group => (
              <div key={group.category}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.category}</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {group.items.map(item => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Qué hizo el agente de IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ShareMeter part={data.agent.agentCommits} whole={data.agent.commits} label="Cambios hechos por el agente" />
            <ul className="space-y-1.5 text-sm">
              {data.agent.highlights.map(h => (
                <li key={h} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Se cuenta como del agente cada commit del sitio firmado por Claude Code (Co-Authored-By). El resto lo hizo el equipo web.
            </p>
          </CardContent>
        </Card>
      </div>

      {data.uploads && (data.uploads.posts.length > 0 || data.uploads.pages.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Lo que se subió al sitio este mes</CardTitle>
            <p className="text-xs text-muted-foreground">
              Clics e impresiones que cada página lleva acumulados en Google, en español e inglés (Search Console, 12 meses al 25 oct 2026).
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.uploads.posts.length > 0 && (
              <UploadTable
                title={`Artículos del blog · ${data.uploads.posts.length}`}
                totals={`${fmt(data.uploads.postsClicks)} clics · ${fmt(data.uploads.postsImpressions)} impresiones`}
                rows={data.uploads.posts.map(p => ({
                  key: p.url,
                  name: p.title,
                  url: p.url,
                  meta: p.scheduled ? `programado ${dateShort(p.date)}` : dateShort(p.date),
                  clicks: p.clicks,
                  impressions: p.impressions,
                }))}
              />
            )}
            {data.uploads.pages.length > 0 && (
              <UploadTable
                title={`Páginas nuevas · ${data.uploads.pages.length}`}
                totals={`${fmt(data.uploads.pagesClicks)} clics · ${fmt(data.uploads.pagesImpressions)} impresiones`}
                rows={data.uploads.pages.map(p => ({
                  key: p.url,
                  name: `/${p.path}`,
                  url: p.url,
                  meta: p.kind,
                  clicks: p.clicks,
                  impressions: p.impressions,
                }))}
              />
            )}
          </CardContent>
        </Card>
      )}

      <p className="pb-4 text-xs text-muted-foreground">
        Fuentes: Search Console (sc-domain:manuelsolis.com), GA4 (propiedad 395596942) y el repositorio del sitio
        Marketing-Manuel-Solis-WebSite/manuelsolis. Los cambios los publicó el equipo web en el repositorio del sitio.
      </p>
    </div>
  )
}

export default async function ReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { site: { select: { name: true, domain: true } } },
  })
  if (!report) notFound()

  if (report.reportType === 'mensual_seo') {
    const [siblings, overview] = await Promise.all([
      prisma.report.findMany({
        where: { reportType: 'mensual_seo' },
        orderBy: { period: 'asc' },
        select: { id: true },
      }),
      prisma.report.findFirst({ where: { reportType: 'resultados_seo' }, orderBy: { generatedAt: 'desc' } }),
    ])
    const i = siblings.findIndex(s => s.id === report.id)
    const data = report.data as unknown as MonthlyReportData
    const allContacts = (overview?.data as unknown as ResultadosData | undefined)?.contacts ?? []
    const prevContacts = [...allContacts].reverse().find(c => c.month < data.month && c.days >= 28) ?? null
    return (
      <MonthlyReportView
        data={data}
        prevContacts={prevContacts}
        prevId={i > 0 ? siblings[i - 1].id : undefined}
        nextId={i >= 0 && i < siblings.length - 1 ? siblings[i + 1].id : undefined}
      />
    )
  }

  if (report.reportType === 'semanal_seo') {
    const weeks = await prisma.report.findMany({ where: { reportType: 'semanal_seo' }, orderBy: { period: 'asc' }, select: { id: true } })
    const i = weeks.findIndex(w => w.id === report.id)
    return (
      <WeeklyReportView
        data={report.data as unknown as WeeklyReportData}
        site={report.site?.domain ?? 'www.manuelsolis.com'}
        prevId={i > 0 ? weeks[i - 1].id : undefined}
        nextId={i >= 0 && i < weeks.length - 1 ? weeks[i + 1].id : undefined}
      />
    )
  }

  if (report.reportType === 'analisis_busqueda') {
    return <SearchAnalysisView data={report.data as unknown as SearchAnalysisData} site={report.site?.domain ?? 'www.manuelsolis.com'} />
  }

  // Other report types: basic view of the stored summary
  return (
    <div className="space-y-6 p-6">
      <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground">← Reportes</Link>
      <PageHeader title={report.title} description={`${report.site?.domain ?? ''} · Periodo: ${report.period} · ${formatDate(report.generatedAt)}`} />
      <Card>
        <CardContent>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
            {JSON.stringify(report.data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
