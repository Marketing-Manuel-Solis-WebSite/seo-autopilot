import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  try {
    const { fixId, approved } = await request.json()

    if (!fixId) {
      return NextResponse.json({ error: 'fixId is required' }, { status: 400 })
    }

    const userId = user.id

    const fix = await prisma.fix.findUnique({ where: { id: fixId } })
    if (!fix) {
      return NextResponse.json({ error: 'Fix not found' }, { status: 404 })
    }

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
  } catch (err) {
    console.error('[Fix Approve]', err)
    return NextResponse.json({ error: 'Error al procesar aprobacion' }, { status: 500 })
  }
}
