import { NextResponse } from 'next/server'
import { getSearchAnalytics, getDateRange, isGSCConfigured } from '@/lib/gsc/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId } = await request.json()
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const site = await prisma.site.findUniqueOrThrow({ where: { id: siteId } })
  if (!isGSCConfigured(site)) {
    return NextResponse.json({ error: 'GSC not configured for this site' }, { status: 400 })
  }

  const data = await getSearchAnalytics(siteId, {
    ...getDateRange(90),
    dimensions: ['query', 'page'],
    rowLimit: 1000,
  })

  return NextResponse.json(data)
}
