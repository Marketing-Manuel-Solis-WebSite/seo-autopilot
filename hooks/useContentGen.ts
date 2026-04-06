'use client'

import { useState } from 'react'

interface ContentGenInput {
  siteId: string
  contentType: string
  targetKeyword: string
  wordCount?: number
  additionalContext?: string
}

interface GeneratedContent {
  contentId: string
  title: string
  slug: string
  metaTitle: string
  metaDescription: string
  body: string
  seoScore: number
}

export function useContentGen() {
  const [generating, setGenerating] = useState(false)
  const [content, setContent] = useState<GeneratedContent | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate(input: ContentGenInput) {
    setGenerating(true)
    setError(null)
    setContent(null)

    try {
      const res = await fetch('/api/claude/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await res.json()
      setContent(data)
      return data
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg)
      return null
    } finally {
      setGenerating(false)
    }
  }

  return { generate, generating, content, error }
}
