'use client'

import { useState, useEffect } from 'react'

interface Site {
  id: string
  name: string
  domain: string
  url: string
  cmsType: string | null
  isActive: boolean
  audits: Array<{ score: number | null }>
  alerts: Array<{ severity: string }>
  _count: { keywords: number; content: number; fixes: number; backlinks: number }
}

export function useSites() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sites')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch sites')
        return r.json()
      })
      .then(setSites)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { sites, loading, error, setSites }
}
