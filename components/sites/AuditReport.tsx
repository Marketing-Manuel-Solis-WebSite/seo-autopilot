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
    claudeAnalysis?: unknown
    model: string | null
    createdAt: string | Date
  }
}

const PRIORITY: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'outline' }> = {
  alta: { label: 'Prioridad alta', variant: 'destructive' },
  high: { label: 'Prioridad alta', variant: 'destructive' },
  critical: { label: 'Crítico', variant: 'destructive' },
  media: { label: 'Prioridad media', variant: 'secondary' },
  medium: { label: 'Prioridad media', variant: 'secondary' },
  baja: { label: 'Prioridad baja', variant: 'outline' },
  low: { label: 'Prioridad baja', variant: 'outline' },
}

export default function AuditReport({ audit }: AuditReportProps) {
  const issues = (audit.criticalIssues ?? []) as Array<{ title: string; impact: string; fix: string; priority: string }>
  const summary = (audit.claudeAnalysis as { summary?: string } | null | undefined)?.summary

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">
            {audit.auditType.toLowerCase().startsWith('auditor') ? audit.auditType : `Auditoría · ${audit.auditType}`}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{formatDateTime(audit.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {audit.model && <Badge variant="outline" className="text-xs">{audit.model}</Badge>}
          <Badge variant={audit.status === 'complete' ? 'default' : 'destructive'}>
            {audit.status === 'complete' ? 'Completa' : audit.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {audit.score !== null && (
            <p className={`shrink-0 text-4xl font-bold font-mono ${audit.score >= 80 ? 'text-green-500' : audit.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
              {audit.score}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </p>
          )}
          {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
        </div>
        {issues.length > 0 ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium">Hallazgos y acciones ({issues.length})</h3>
            {issues.map((issue, i) => {
              const p = PRIORITY[issue.priority?.toLowerCase()] ?? { label: issue.priority, variant: 'secondary' as const }
              return (
                <div key={i} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={p.variant} className="text-xs">{p.label}</Badge>
                    <span className="font-medium">{issue.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{issue.impact}</p>
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">{issue.fix}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-green-600 dark:text-green-400">Sin hallazgos pendientes: todas las revisiones pasaron.</p>
        )}
      </CardContent>
    </Card>
  )
}
