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

  const competitors = await prisma.competitor.findMany({
    where: { siteId },
    orderBy: { visibilityScore: 'desc' },
  })

  return NextResponse.json(competitors)
}
