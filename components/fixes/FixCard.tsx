'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, AlertTriangle } from 'lucide-react'

interface FixCardProps {
  fix: {
    id: string
    fixType: string
    priority: string
    title: string
    description: string
    affectedUrl: string | null
    beforeValue: string | null
    afterValue: string | null
    isDestructive: boolean
    site?: { name: string; domain: string }
  }
  onAction: (fixId: string, status: string) => void
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
}

export default function FixCard({ fix, onAction }: FixCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/fixes/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixId: fix.id, approved: true }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      onAction(fix.id, 'approved')
    } catch (err) {
      console.error('[FixCard] approve failed:', err)
      setError('Error al aprobar')
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/fixes/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixId: fix.id, approved: false }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      onAction(fix.id, 'rejected')
    } catch (err) {
      console.error('[FixCard] reject failed:', err)
      setError('Error al rechazar')
      setLoading(false)
    }
  }

  return (
    <Card className={fix.isDestructive ? 'border-red-500/30' : ''}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <div className="flex items-center gap-2">
            <Badge className={priorityColors[fix.priority] ?? ''}>{fix.priority}</Badge>
            <Badge variant="outline" className="text-xs">{fix.fixType}</Badge>
            {fix.isDestructive && (
              <Badge variant="destructive" className="gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Destructivo
              </Badge>
            )}
          </div>
          <CardTitle className="mt-2 text-base">{fix.title}</CardTitle>
          {fix.site && (
            <p className="text-xs text-muted-foreground">{fix.site.domain}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{fix.description}</p>

        {fix.affectedUrl && (
          <p className="text-xs font-mono text-muted-foreground">URL: {fix.affectedUrl}</p>
        )}

        {(fix.beforeValue || fix.afterValue) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {fix.beforeValue && (
              <div className="rounded-md bg-red-500/5 p-2">
                <p className="text-xs text-muted-foreground">Antes</p>
                <p className="font-mono text-xs">{fix.beforeValue}</p>
              </div>
            )}
            {fix.afterValue && (
              <div className="rounded-md bg-green-500/5 p-2">
                <p className="text-xs text-muted-foreground">Después</p>
                <p className="font-mono text-xs">{fix.afterValue}</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={handleApprove} disabled={loading} className="gap-1">
            <Check className="h-3 w-3" /> Aprobar
          </Button>
          <Button size="sm" variant="destructive" onClick={handleReject} disabled={loading} className="gap-1">
            <X className="h-3 w-3" /> Rechazar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
