import { NextResponse } from 'next/server'
import { getKeywordData } from '@/lib/dataforseo/client'
import { getSearchAnalytics, getDateRange, isGSCConfigured } from '@/lib/gsc/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId, keyword, type, database } = await request.json()

  if (type === 'overview' && keyword) {
    const data = await getKeywordData([keyword], database)
    return NextResponse.json(data)
  }

  if (siteId) {
    const site = await prisma.site.findUniqueOrThrow({ where: { id: siteId } })
    if (isGSCConfigured(site)) {
      const rows = await getSearchAnalytics(siteId, {
        ...getDateRange(28),
        dimensions: ['query', 'page'],
        rowLimit: 500,
      })
      return NextResponse.json(rows)
    }
  }

  return NextResponse.json([])
}
