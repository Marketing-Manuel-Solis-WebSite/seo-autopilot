'use client'

import { useState, useEffect, useCallback } from 'react'

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

export function useAlerts(siteId?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ unreadOnly: 'true' })
    if (siteId) params.set('siteId', siteId)

    fetch(`/api/alerts?${params}`)
      .then(r => {
        if (!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(setAlerts)
      .catch(err => {
        console.error('[useAlerts] fetch failed:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [siteId])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  async function markRead(alertId: string) {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, isRead: true }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, isRead: true } : a)))
    } catch (err) {
      console.error('[useAlerts] markRead failed:', err)
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
      console.error('[useAlerts] resolve failed:', err)
    }
  }

  return { alerts, loading, error, refresh: fetchAlerts, markRead, resolve }
}
