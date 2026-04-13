'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { severityColor, formatDateTime } from '@/lib/utils/helpers'
import { Check, Eye } from 'lucide-react'
import AlertFilters from './AlertFilters'

interface Alert {
  id: string
  alertType: string
  severity: string
  title: string
  message: string
  isRead: boolean
  isResolved: boolean
  createdAt: string
  site: { name: string; domain: string }
}

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({ severity: '', unreadOnly: true })

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (filter.severity) params.set('severity', filter.severity)
    if (filter.unreadOnly) params.set('unreadOnly', 'true')

    fetch(`/api/alerts?${params}`)
      .then(r => {
        if (!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(setAlerts)
      .catch(err => {
        console.error('[AlertCenter] fetch failed:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [filter])

  async function markRead(alertId: string) {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, isRead: true }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isRead: true } : a))
    } catch (err) {
      console.error('[AlertCenter] markRead failed:', err)
    }
  }

  async function resolve(alertId: string) {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, isResolved: true }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch (err) {
      console.error('[AlertCenter] resolve failed:', err)
    }
  }

  return (
    <div className="space-y-4">
      <AlertFilters filter={filter} onChange={setFilter} />

      {loading && (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando alertas...</p>
      )}

      {error && (
        <p className="py-8 text-center text-sm text-red-500">Error al cargar alertas: {error}</p>
      )}

      {!loading && !error && alerts.map(alert => (
        <Card key={alert.id} className={severityColor(alert.severity)}>
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {alert.alertType.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">{alert.severity}</Badge>
                <span className="text-xs opacity-70">{alert.site.domain}</span>
              </div>
              <CardTitle className="mt-1 text-base">{alert.title}</CardTitle>
            </div>
            <time className="text-xs opacity-50">{formatDateTime(alert.createdAt)}</time>
          </CardHeader>
          <CardContent>
            <p className="mb-3 whitespace-pre-wrap text-sm opacity-80">{alert.message}</p>
            <div className="flex gap-2">
              {!alert.isRead && (
                <Button size="sm" variant="outline" onClick={() => markRead(alert.id)} className="gap-1">
                  <Eye className="h-3 w-3" /> Marcar leída
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => resolve(alert.id)} className="gap-1">
                <Check className="h-3 w-3" /> Resolver
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {!loading && !error && alerts.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin alertas</p>
      )}
    </div>
  )
}
