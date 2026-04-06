import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function GET(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get('siteId')
  const severity = searchParams.get('severity')
  const unreadOnly = searchParams.get('unreadOnly') === 'true'

  const alerts = await prisma.alert.findMany({
    where: {
      ...(siteId ? { siteId } : {}),
      ...(severity ? { severity } : {}),
      ...(unreadOnly ? { isRead: false } : {}),
    },
    include: { site: { select: { name: true, domain: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(alerts)
}

export async function PATCH(request: Request) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const { alertId, isRead, isResolved } = await request.json()

  const data: Record<string, unknown> = {}
  if (isRead !== undefined) data.isRead = isRead
  if (isResolved !== undefined) {
    data.isResolved = isResolved
    if (isResolved) data.resolvedAt = new Date()
  }

  const alert = await prisma.alert.update({
    where: { id: alertId },
    data,
  })

  return NextResponse.json(alert)
}
