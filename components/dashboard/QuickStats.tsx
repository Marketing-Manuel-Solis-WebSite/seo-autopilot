import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface QuickStatsProps {
  pendingFixes: number
  pendingContent: number
  totalKeywords: number
  totalBacklinks: number
}

export default function QuickStats({
  pendingFixes,
  pendingContent,
  totalKeywords,
  totalBacklinks,
}: QuickStatsProps) {
  const stats = [
    { label: 'Fixes pendientes', value: pendingFixes, urgent: pendingFixes > 0 },
    { label: 'Contenido por aprobar', value: pendingContent, urgent: pendingContent > 5 },
    { label: 'Keywords rastreadas', value: totalKeywords },
    { label: 'Backlinks activos', value: totalBacklinks },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumen rápido</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <p className={`text-2xl font-bold font-mono ${stat.urgent ? 'text-yellow-500' : ''}`}>
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
