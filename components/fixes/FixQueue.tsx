'use client'

import { useState, useEffect } from 'react'
import FixCard from './FixCard'

interface Fix {
  id: string
  siteId: string
  fixType: string
  priority: string
  title: string
  description: string
  affectedUrl: string | null
  beforeValue: string | null
  afterValue: string | null
  isDestructive: boolean
  status: string
  site?: { name: string; domain: string }
}

export default function FixQueue() {
  const [fixes, setFixes] = useState<Fix[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/fixes?status=pending_approval')
      .then(r => {
        if (!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(data => { setFixes(data); setLoading(false) })
      .catch(err => {
        console.error('[FixQueue] fetch failed:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  function handleAction(fixId: string, newStatus: string) {
    setFixes(prev => prev.filter(f => f.id !== fixId))
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando fixes...</p>
  if (error) return <p className="text-sm text-red-500">Error al cargar fixes: {error}</p>
  if (fixes.length === 0) return <p className="text-sm text-muted-foreground">No hay fixes pendientes de aprobación.</p>

  return (
    <div className="space-y-4">
      {fixes.map(fix => (
        <FixCard key={fix.id} fix={fix} onAction={handleAction} />
      ))}
    </div>
  )
}
