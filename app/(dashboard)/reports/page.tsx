import { prisma } from '@/lib/prisma'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/helpers'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { generatedAt: 'desc' },
    take: 30,
    include: { site: { select: { name: true, domain: true } } },
  })

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Reportes" description="Reportes automáticos generados por el sistema" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map(report => (
          <Card key={report.id} className="transition-colors hover:bg-accent/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">{report.reportType}</Badge>
                <time className="text-xs text-muted-foreground">{formatDate(report.generatedAt)}</time>
              </div>
              <CardTitle className="text-sm">{report.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {report.site && (
                <p className="text-xs text-muted-foreground">{report.site.domain}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Periodo: {report.period}</p>
            </CardContent>
          </Card>
        ))}
        {reports.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Sin reportes generados aún</p>
        )}
      </div>
    </div>
  )
}
