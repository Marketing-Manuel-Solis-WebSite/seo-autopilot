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

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      audits: { orderBy: { createdAt: 'desc' }, take: 5 },
      alerts: { where: { isRead: false }, orderBy: { createdAt: 'desc' }, take: 10 },
      fixes: { where: { status: 'pending_approval' }, orderBy: { createdAt: 'desc' } },
      _count: {
        select: { keywords: true, content: true, backlinks: true, rankings: true },
      },
    },
  })

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  return NextResponse.json(site)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId } = await params
  const body = await request.json()

  const site = await prisma.site.update({
    where: { id: siteId },
    data: body,
  })

  return NextResponse.json(site)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId } = await params

  await prisma.site.update({
    where: { id: siteId },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}
