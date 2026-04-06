import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils/helpers'

interface AuditReportProps {
  audit: {
    id: string
    auditType: string
    status: string
    score: number | null
    issuesCount: number
    criticalIssues: unknown
    model: string | null
    createdAt: string | Date
  }
}

export default function AuditReport({ audit }: AuditReportProps) {
  const issues = (audit.criticalIssues ?? []) as Array<{ title: string; impact: string; fix: string; priority: string }>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Auditoría {audit.auditType}</CardTitle>
          <p className="text-xs text-muted-foreground">{formatDateTime(audit.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {audit.model && (
            <Badge variant="outline" className="font-mono text-xs">{audit.model}</Badge>
          )}
          <Badge variant={audit.status === 'complete' ? 'default' : 'destructive'}>
            {audit.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {audit.score !== null && (
          <p className={`text-4xl font-bold font-mono ${audit.score >= 80 ? 'text-green-500' : audit.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
            {audit.score}
            <span className="text-sm font-normal text-muted-foreground">/100</span>
          </p>
        )}
        {issues.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium">Issues críticos ({issues.length})</h3>
            {issues.map((issue, i) => (
              <div key={i} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">{issue.priority}</Badge>
                  <span className="font-medium">{issue.title}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{issue.impact}</p>
                <p className="mt-1 text-xs text-green-600">{issue.fix}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
