import { NextResponse } from 'next/server'
import { claudeSonnetFixSuggestion } from '@/lib/claude/sonnet'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { siteId, issue, currentValue } = await request.json()

    if (!siteId || !issue) {
      return NextResponse.json({ error: 'siteId and issue are required' }, { status: 400 })
    }

    const site = await prisma.site.findUnique({ where: { id: siteId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const suggestion = await claudeSonnetFixSuggestion({
      issue,
      siteContext: { domain: site.domain, name: site.name },
      currentValue: currentValue ?? '',
    })

    return NextResponse.json(suggestion)
  } catch (err) {
    console.error('[Claude Fix Suggestion]', err)
    return NextResponse.json(
      { error: 'Error generating fix suggestion', detail: (err as Error).message },
      { status: 500 },
    )
  }
}
