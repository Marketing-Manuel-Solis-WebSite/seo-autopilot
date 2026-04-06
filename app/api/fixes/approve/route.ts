import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { fixId, approved } = await request.json()
  const userId = user.id

  const fix = await prisma.fix.findUniqueOrThrow({ where: { id: fixId } })

  if (!approved) {
    await prisma.fix.update({
      where: { id: fixId },
      data: { status: 'rejected' },
    })
    return NextResponse.json({ status: 'rejected' })
  }

  const rollbackData = {
    previousValue: fix.beforeValue,
    timestamp: new Date().toISOString(),
    approvedBy: userId,
  }

  await prisma.fix.update({
    where: { id: fixId },
    data: {
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date(),
      rollbackData: rollbackData as never,
    },
  })

  return NextResponse.json({ status: 'approved', fixId })
}
