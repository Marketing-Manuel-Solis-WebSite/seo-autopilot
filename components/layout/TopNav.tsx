'use client'

import { Bell, Search, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TopNavProps {
  systemStatus: 'ok' | 'warning' | 'critical'
  alertCount: number
}

export default function TopNav({ systemStatus, alertCount }: TopNavProps) {
  const statusConfig = {
    ok: { color: 'bg-green-500', label: 'Todos los sistemas OK' },
    warning: { color: 'bg-yellow-500', label: 'Warnings detectados' },
    critical: { color: 'bg-red-500', label: 'Alertas críticas activas' },
  }

  const status = statusConfig[systemStatus]

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${status.color}`} />
          <span className="text-xs text-muted-foreground">{status.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar sitios, keywords..."
            className="w-64 pl-9"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Activity className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
            >
              {alertCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  )
}
