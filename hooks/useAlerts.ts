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

  const fetchAlerts = useCallback(() => {
    const params = new URLSearchParams({ unreadOnly: 'true' })
    if (siteId) params.set('siteId', siteId)

    fetch(`/api/alerts?${params}`)
      .then(r => r.json())
      .then(setAlerts)
      .finally(() => setLoading(false))
  }, [siteId])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  async function markRead(alertId: string) {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, isRead: true }),
    })
    setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, isRead: true } : a)))
  }

  async function resolve(alertId: string) {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, isResolved: true }),
    })
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  return { alerts, loading, refresh: fetchAlerts, markRead, resolve }
}
