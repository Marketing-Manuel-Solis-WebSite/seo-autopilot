import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, FileCheck, Search, Link2 } from 'lucide-react'

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
    {
      label: 'Fixes pendientes',
      value: pendingFixes,
      urgent: pendingFixes > 0,
      icon: Wrench,
      color: pendingFixes > 0 ? 'text-yellow-500' : 'text-muted-foreground',
      bg: pendingFixes > 0 ? 'bg-yellow-500/10' : 'bg-muted',
    },
    {
      label: 'Contenido por aprobar',
      value: pendingContent,
      urgent: pendingContent > 5,
      icon: FileCheck,
      color: pendingContent > 5 ? 'text-orange-500' : 'text-muted-foreground',
      bg: pendingContent > 5 ? 'bg-orange-500/10' : 'bg-muted',
    },
    {
      label: 'Keywords rastreadas',
      value: totalKeywords,
      icon: Search,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Backlinks activos',
      value: totalBacklinks,
      icon: Link2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumen rapido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${stat.bg}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-xl font-bold font-mono ${stat.urgent ? stat.color : ''}`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
