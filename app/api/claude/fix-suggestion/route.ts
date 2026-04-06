import { NextResponse } from 'next/server'
import { claudeSonnetFixSuggestion } from '@/lib/claude/sonnet'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId, issue, currentValue } = await request.json()

  const site = await prisma.site.findUniqueOrThrow({ where: { id: siteId } })

  const suggestion = await claudeSonnetFixSuggestion({
    issue,
    siteContext: { domain: site.domain, name: site.name },
    currentValue,
  })

  return NextResponse.json(suggestion)
}
