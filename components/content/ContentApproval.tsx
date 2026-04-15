'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X } from 'lucide-react'

function sanitizeHTML(html: string): string {
  // Strip script tags, event handlers, and javascript: URLs
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/<iframe\b[^>]*>/gi, '')
    .replace(/<object\b[^>]*>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
}

interface ContentApprovalProps {
  content: {
    title: string
    metaTitle: string
    metaDescription: string
    body: string
    seoScore: number
    slug: string
    contentId?: string
  }
  siteId: string
}

export default function ContentApproval({ content, siteId }: ContentApprovalProps) {
  const [status, setStatus] = useState<'idle' | 'approving' | 'approved' | 'rejected' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setStatus('approving')
    setError(null)
    try {
      const res = await fetch('/api/content/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: content.contentId, approved: true }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error ?? `Error ${res.status}`)
      }
      setStatus('approved')
    } catch (err) {
      console.error('[ContentApproval] approve failed:', err)
      setError((err as Error).message)
      setStatus('error')
    }
  }

  async function handleReject() {
    setError(null)
    try {
      const res = await fetch('/api/content/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: content.contentId, approved: false }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error ?? `Error ${res.status}`)
      }
      setStatus('rejected')
    } catch (err) {
      console.error('[ContentApproval] reject failed:', err)
      setError((err as Error).message)
      setStatus('error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Revisión de contenido</CardTitle>
          <Badge className="font-mono">SEO: {content.seoScore}/100</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Meta Title</p>
          <p className="text-sm font-medium">{content.metaTitle}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Meta Description</p>
          <p className="text-sm">{content.metaDescription}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Slug</p>
          <p className="text-sm font-mono">/{content.slug}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-xs text-muted-foreground mb-2">Contenido</p>
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(content.body) }}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">Error: {error}</p>
        )}

        {(status === 'idle' || status === 'error') && (
          <div className="flex gap-3">
            <Button onClick={handleApprove} className="gap-2">
              <Check className="h-4 w-4" />
              Aprobar y publicar
            </Button>
            <Button variant="destructive" onClick={handleReject} className="gap-2">
              <X className="h-4 w-4" />
              Rechazar
            </Button>
          </div>
        )}
        {status === 'approving' && (
          <Badge className="bg-yellow-500/10 text-yellow-500">Aprobando...</Badge>
        )}
        {status === 'approved' && (
          <Badge className="bg-green-500/10 text-green-500">Contenido aprobado</Badge>
        )}
        {status === 'rejected' && (
          <Badge className="bg-red-500/10 text-red-500">Contenido rechazado</Badge>
        )}
      </CardContent>
    </Card>
  )
}
