import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId } = await request.json()
  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 })
  }

  await prisma.site.update({
    where: { id: siteId },
    data: { gscCredentials: Prisma.DbNull, gscPropertyUrl: null },
  })

  return NextResponse.json({ success: true })
}
