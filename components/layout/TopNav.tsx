'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAlerts } from '@/hooks/useAlerts'
import { Check, Eye } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/helpers'

interface TopNavProps {
  systemStatus: 'ok' | 'warning' | 'critical'
  alertCount: number
}

export default function TopNav({ systemStatus, alertCount }: TopNavProps) {
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const { alerts, loading, refresh, markRead, resolve } = useAlerts()

  const statusConfig = {
    ok: { color: 'bg-green-500', label: 'Todos los sistemas OK' },
    warning: { color: 'bg-yellow-500', label: 'Warnings detectados' },
    critical: { color: 'bg-red-500', label: 'Alertas criticas activas' },
  }

  const status = statusConfig[systemStatus]

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    if (bellOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [bellOpen])

  function toggleBell() {
    if (!bellOpen) refresh()
    setBellOpen(prev => !prev)
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${status.color}`} />
          <span className="text-xs text-muted-foreground">{status.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={bellRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={toggleBell}
          >
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

          {bellOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-96 max-h-[28rem] overflow-y-auto rounded-lg border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-semibold">Notificaciones</span>
                <a href="/alerts" className="text-xs text-primary hover:underline">
                  Ver todas
                </a>
              </div>

              {loading && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Cargando...</p>
              )}

              {!loading && alerts.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin alertas nuevas</p>
              )}

              {!loading && alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`border-b px-4 py-3 last:border-0 ${!alert.isRead ? 'bg-accent/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {alert.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {alert.site?.domain ?? ''}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium leading-tight">{alert.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                    </div>
                    <time className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDateTime(alert.createdAt)}
                    </time>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    {!alert.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => markRead(alert.id)}
                      >
                        <Eye className="h-3 w-3" /> Leida
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs gap-1"
                      onClick={() => { resolve(alert.id) }}
                    >
                      <Check className="h-3 w-3" /> Resolver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
