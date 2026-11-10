import { prisma } from '@/lib/prisma'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/helpers'
import Link from 'next/link'
import type { MonthlyReportData } from '@/lib/resultados/types'
import { monthLong, monthShort } from '@/lib/resultados/types'
import { fmt, pctChange } from '@/components/resultados/Stats'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const [dashboard, monthly, others] = await Promise.all([
    prisma.report.findFirst({ where: { reportType: 'resultados_seo' }, orderBy: { generatedAt: 'desc' } }),
    prisma.report.findMany({ where: { reportType: 'mensual_seo' }, orderBy: { period: 'desc' } }),
    prisma.report.findMany({
      where: { reportType: { notIn: ['resultados_seo', 'mensual_seo'] } },
      orderBy: { generatedAt: 'desc' },
      take: 30,
      include: { site: { select: { name: true, domain: true } } },
    }),
  ])

  const nothing = !dashboard && monthly.length === 0 && others.length === 0

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Reportes" description="Tablero de resultados, reportes mensuales de SEO y reportes del sistema" />

      {dashboard && (
        <Link href="/resultados" className="block">
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">Tablero</Badge>
                <time className="text-xs text-muted-foreground">{formatDate(dashboard.generatedAt)}</time>
              </div>
              <CardTitle className="text-sm">{dashboard.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Gráficas, indicadores y tabla mensual · Periodo: {dashboard.period}</p>
              <p className="mt-2 text-xs font-medium text-primary">Ver tablero →</p>
            </CardContent>
          </Card>
        </Link>
      )}

      {monthly.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Reportes mensuales de SEO</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {monthly.map(r => {
              const m = r.data as unknown as MonthlyReportData
              const partial = m.metrics.partial?.gsc
              const d = pctChange(m.metrics.gscImpressions, m.previous.gscImpressions)
              return (
                <Link key={r.id} href={`/reports/${r.id}`} className="block">
                  <Card className="h-full transition-colors hover:bg-accent/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{partial ? 'En curso' : 'Mensual'}</Badge>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          agente {fmt(m.agent.agentCommits)}/{fmt(m.agent.commits)}
                        </span>
                      </div>
                      <CardTitle className="text-sm capitalize">{monthLong(m.month)} {m.month.slice(0, 4)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-snug">{m.headline}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {partial
                          ? `${fmt(m.metrics.gscClicks ?? 0)} clics · ${partial}`
                          : `${fmt(m.metrics.gscImpressions ?? 0)} impresiones${
                              d !== null ? ` · ${d >= 0 ? '+' : '−'}${fmt(Math.round(Math.abs(d)))} % vs ${monthShort(m.previous.month)}` : ''
                            }`}
                      </p>
                      <p className="mt-2 text-xs font-medium text-primary">Ver reporte →</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Reportes del sistema</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map(report => (
              <Link key={report.id} href={`/reports/${report.id}`} className="block">
                <Card className="h-full transition-colors hover:bg-accent/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{report.reportType}</Badge>
                      <time className="text-xs text-muted-foreground">{formatDate(report.generatedAt)}</time>
                    </div>
                    <CardTitle className="text-sm">{report.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.site && <p className="text-xs text-muted-foreground">{report.site.domain}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">Periodo: {report.period}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {nothing && <p className="py-8 text-center text-sm text-muted-foreground">Sin reportes generados aún</p>}
    </div>
  )
}
