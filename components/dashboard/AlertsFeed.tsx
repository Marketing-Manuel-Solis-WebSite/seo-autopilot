import { Badge } from '@/components/ui/badge'
import { severityColor } from '@/lib/utils/helpers'
import { formatDateTime } from '@/lib/utils/helpers'

interface Alert {
  id: string
  alertType: string
  severity: string
  title: string
  message: string
  createdAt: string | Date
  site?: { name: string; domain: string }
}

interface AlertsFeedProps {
  alerts: Alert[]
}

export default function AlertsFeed({ alerts }: AlertsFeedProps) {
  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`rounded-md border p-3 ${severityColor(alert.severity)}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {alert.alertType.replace('_', ' ')}
                </Badge>
                {alert.site && (
                  <span className="text-xs opacity-70">{alert.site.domain}</span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium">{alert.title}</p>
              {alert.message && (
                <p className="mt-0.5 text-xs opacity-70 line-clamp-2">{alert.message}</p>
              )}
            </div>
            <time className="shrink-0 text-xs opacity-50">
              {formatDateTime(alert.createdAt)}
            </time>
          </div>
        </div>
      ))}
      {alerts.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sin alertas activas
        </p>
      )}
    </div>
  )
}
