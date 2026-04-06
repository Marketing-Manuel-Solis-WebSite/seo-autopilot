import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function GET(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get('siteId')
  const status = searchParams.get('status') ?? 'pending_approval'

  const fixes = await prisma.fix.findMany({
    where: {
      ...(siteId ? { siteId } : {}),
      status,
    },
    include: { site: { select: { name: true, domain: true } } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  })

  return NextResponse.json(fixes)
}
