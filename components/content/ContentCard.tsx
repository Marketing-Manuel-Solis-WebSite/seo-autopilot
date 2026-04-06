'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/helpers'

interface ContentCardProps {
  content: {
    id: string
    title: string
    contentType: string
    targetKeyword: string
    status: string
    seoScore: number | null
    wordCount: number | null
    generatedBy: string
    createdAt: string | Date
    site?: { name: string }
  }
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-500',
  pending_approval: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-blue-500/10 text-blue-500',
  published: 'bg-green-500/10 text-green-500',
  rejected: 'bg-red-500/10 text-red-500',
  publish_failed: 'bg-red-500/10 text-red-500',
}

export default function ContentCard({ content }: ContentCardProps) {
  const [retrying, setRetrying] = useState(false)
  const [retryResult, setRetryResult] = useState<string | null>(null)

  async function handleRetryPublish() {
    setRetrying(true)
    setRetryResult(null)
    try {
      const res = await fetch('/api/content/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: content.id }),
      })
      if (res.ok) {
        setRetryResult('published')
      } else {
        const data = await res.json()
        setRetryResult(data.error ?? 'Retry failed')
      }
    } catch {
      setRetryResult('Network error')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs capitalize">{content.contentType}</Badge>
          <Badge className={`text-xs ${statusColors[content.status] ?? ''}`}>
            {content.status.replace('_', ' ')}
          </Badge>
        </div>
        <CardTitle className="text-base">{content.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Keyword: <strong>{content.targetKeyword}</strong></span>
          {content.seoScore !== null && (
            <span className="font-mono">SEO: {content.seoScore}/100</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{content.wordCount ? `${content.wordCount} palabras` : ''}</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">{content.generatedBy}</Badge>
            <span>{formatDate(content.createdAt)}</span>
          </div>
        </div>
        {content.status === 'publish_failed' && (
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs border-red-500/30 text-red-500 hover:bg-red-500/10"
              onClick={handleRetryPublish}
              disabled={retrying || retryResult === 'published'}
            >
              {retrying ? 'Reintentando...' : retryResult === 'published' ? 'Publicado' : 'Reintentar publicación'}
            </Button>
            {retryResult && retryResult !== 'published' && (
              <p className="mt-1 text-xs text-red-500">{retryResult}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
