import { Card } from '@/components/ui/card'
import { Globe, TrendingUp, AlertTriangle, FileText } from 'lucide-react'

interface GlobalMetricsBarProps {
  sites: Array<{
    audits: Array<{ score: number | null }>
    alerts: Array<{ severity: string }>
    rankings: Array<{ change: number | null }>
  }>
}

export default function GlobalMetricsBar({ sites }: GlobalMetricsBarProps) {
  const totalSites = sites.length
  const avgScore = Math.round(
    sites.reduce((sum, s) => sum + (s.audits[0]?.score ?? 0), 0) / (totalSites || 1)
  )
  const totalAlerts = sites.reduce((sum, s) => sum + s.alerts.length, 0)
  const improving = sites.reduce(
    (sum, s) => sum + s.rankings.filter(r => (r.change ?? 0) > 0).length,
    0
  )

  const metrics = [
    { label: 'Sitios activos', value: totalSites, icon: Globe, color: 'text-blue-500' },
    { label: 'Score promedio', value: avgScore, icon: TrendingUp, color: 'text-green-500' },
    { label: 'Alertas activas', value: totalAlerts, icon: AlertTriangle, color: totalAlerts > 0 ? 'text-red-500' : 'text-green-500' },
    { label: 'Rankings mejorando', value: improving, icon: FileText, color: 'text-emerald-500' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map(metric => {
        const Icon = metric.icon
        return (
          <Card key={metric.label} className="flex items-center gap-4 p-4">
            <div className={`rounded-lg bg-muted p-2 ${metric.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold font-mono">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
