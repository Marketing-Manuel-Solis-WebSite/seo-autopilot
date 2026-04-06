import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getScoreColor, getScoreLabel } from '@/lib/utils/seo-score'

interface Site {
  id: string
  name: string
  domain: string
  audits: Array<{ score: number | null }>
  alerts: Array<{ severity: string }>
  rankings: Array<{ change: number | null; keywordText: string }>
}

interface SiteHealthGridProps {
  sites: Site[]
}

export default function SiteHealthGrid({ sites }: SiteHealthGridProps) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Health de sitios</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map(site => {
          const score = site.audits[0]?.score ?? 0
          const criticalAlerts = site.alerts.filter(a => a.severity === 'critical').length
          const rankingUp = site.rankings.filter(r => (r.change ?? 0) > 0).length
          const rankingDown = site.rankings.filter(r => (r.change ?? 0) < 0).length

          return (
            <Link key={site.id} href={`/sites/${site.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{site.name}</CardTitle>
                  {criticalAlerts > 0 && (
                    <Badge variant="destructive">{criticalAlerts} alertas</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{site.domain}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className={`text-3xl font-bold font-mono ${getScoreColor(score)}`}>
                        {score}
                      </p>
                      <p className="text-xs text-muted-foreground">{getScoreLabel(score)}</p>
                    </div>
                    <div className="text-right text-xs">
                      {rankingUp > 0 && (
                        <p className="text-green-500">+{rankingUp} subieron</p>
                      )}
                      {rankingDown > 0 && (
                        <p className="text-red-500">{rankingDown} bajaron</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
