import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WeeklyReportData } from '@/lib/resultados/types'
import { DailyClicks } from '@/components/resultados/ResultadosCharts'
import { fmt, pctChange, ShareMeter, StatTile } from '@/components/resultados/Stats'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const dayName = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}`
}

export default function WeeklyReportView({
  data,
  site,
  prevId,
  nextId,
}: {
  data: WeeklyReportData
  site: string
  prevId?: string
  nextId?: string
}) {
  const p = data.previous
  const posDiff = data.position !== null && p?.position != null ? Math.round((data.position - p.position) * 10) / 10 : null
  const contactsTotal = data.contacts ? data.contacts.phone + data.contacts.whatsapp + data.contacts.consulta + data.contacts.form : null

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/reports" className="text-muted-foreground hover:text-foreground">← Reportes</Link>
        <div className="flex items-center gap-4">
          {prevId && (
            <Link href={`/reports/${prevId}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Semana anterior
            </Link>
          )}
          {nextId && (
            <Link href={`/reports/${nextId}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              Semana siguiente <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <PageHeader title={`Reporte semanal SEO · ${data.label} 2026`} description={`${site} · lunes a domingo · Search Console y repositorio del sitio`} />

      <Card>
        <CardContent className="py-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Resumen de la semana</p>
          <p className="mt-2 text-lg font-semibold leading-snug">{data.headline}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Clics desde Google"
          value={fmt(data.clicks)}
          delta={p ? pctChange(data.clicks, p.clicks) : null}
          deltaSuffix={p ? `vs ${p.label} (${fmt(p.clicks)})` : ''}
        />
        <StatTile
          label="Impresiones en Google"
          value={fmt(data.impressions)}
          delta={p ? pctChange(data.impressions, p.impressions) : null}
          deltaSuffix={p ? `vs ${p.label} (${fmt(p.impressions)})` : ''}
        />
        <StatTile label="CTR" value={`${data.ctr.toFixed(2)} %`} delta={null} deltaSuffix="" />
        {data.position !== null && (
          <StatTile
            label="Posición media"
            value={fmt(Math.round(data.position * 10) / 10)}
            note="más bajo es mejor"
            delta={posDiff !== null && p?.position ? (posDiff / p.position) * 100 : null}
            absolute={posDiff ?? undefined}
            lowerIsBetter
            deltaSuffix={p?.position != null ? `vs ${p.label} (${fmt(Math.round(p.position * 10) / 10)})` : ''}
          />
        )}
        <StatTile label="Mejor día" value={`${fmt(data.bestDay.clicks)} clics`} note={dayName(data.bestDay.date)} delta={null} deltaSuffix="" />
        {data.contacts && contactsTotal !== null && (
          <StatTile
            label="Contactos medidos (GA4)"
            value={fmt(contactsTotal)}
            note={`llamada ${fmt(data.contacts.phone)} · WhatsApp ${fmt(data.contacts.whatsapp)} · consulta ${fmt(data.contacts.consulta)} · formulario ${fmt(data.contacts.form)}`}
            delta={null}
            deltaSuffix=""
          />
        )}
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Clics por día</CardTitle>
          <p className="text-xs text-muted-foreground">Search Console · las impresiones de cada día van en el tooltip</p>
        </CardHeader>
        <CardContent>
          <DailyClicks daily={data.days} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cambios publicados en el sitio · {fmt(data.commits)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.commits > 0 && (
              <ShareMeter part={data.agentCommits} whole={data.commits} label="Hechos por el agente de IA" />
            )}
            {data.changes.length > 0 ? (
              <ul className="divide-y">
                {data.changes.map((c, i) => (
                  <li key={`${c.date}-${i}`} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 break-words">{c.subject}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {c.agent && <Badge variant="outline" className="text-[10px]">agente IA</Badge>}
                      {dayName(c.date)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {data.commits > 0 ? 'Cambios menores sin descripción en el repositorio.' : 'Semana sin cambios en el código del sitio.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Artículos publicados · {fmt(data.posts.length)}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.posts.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {data.posts.map(post => (
                  <li key={post.url}>
                    <a href={post.url} target="_blank" rel="noreferrer" className="hover:underline">{post.title}</a>
                    <p className="text-xs text-muted-foreground">{dayName(post.date)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin artículos nuevos esta semana.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="pb-4 text-xs text-muted-foreground">
        Fuentes: Search Console (sc-domain:manuelsolis.com), GA4 (propiedad 395596942) y el repositorio Marketing-Manuel-Solis-WebSite/manuelsolis.
      </p>
    </div>
  )
}
