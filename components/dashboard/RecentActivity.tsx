import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/helpers'

interface MonitoringLog {
  id: string
  runType: string
  model: string
  status: string
  durationMs: number | null
  createdAt: string | Date
  site: { name: string }
}

interface RecentActivityProps {
  logs: MonitoringLog[]
}

const runTypeLabels: Record<string, string> = {
  hourly_monitor: 'Monitoreo',
  deep_audit: 'Auditoría profunda',
  rank_check: 'Check rankings',
  content_gen: 'Generación contenido',
}

export default function RecentActivity({ logs }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actividad reciente del sistema</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <Badge
                  variant={log.status === 'success' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {log.status}
                </Badge>
                <div>
                  <span className="font-medium">{runTypeLabels[log.runType] ?? log.runType}</span>
                  <span className="text-muted-foreground"> — {log.site.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {log.model}
                </Badge>
                {log.durationMs && (
                  <span className="font-mono">{(log.durationMs / 1000).toFixed(1)}s</span>
                )}
                <time>{formatDateTime(log.createdAt)}</time>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
