import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId } = await params

  const keywords = await prisma.keyword.findMany({
    where: { siteId, isTracking: true },
    include: {
      rankings: {
        orderBy: { checkedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { searchVolume: 'desc' },
  })

  return NextResponse.json(keywords)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const { siteId } = await params
  const body = await request.json()

  const keyword = await prisma.keyword.create({
    data: {
      siteId,
      keyword: body.keyword,
      searchVolume: body.searchVolume,
      difficulty: body.difficulty,
      cpc: body.cpc,
      intent: body.intent,
      targetUrl: body.targetUrl,
    },
  })

  return NextResponse.json(keyword, { status: 201 })
}
