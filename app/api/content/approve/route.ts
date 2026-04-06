import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { contentId, approved } = await request.json()
  const userId = user.id

  if (!approved) {
    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'rejected' },
    })
    return NextResponse.json({ status: 'rejected' })
  }

  await prisma.content.update({
    where: { id: contentId },
    data: {
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date(),
    },
  })

  return NextResponse.json({ status: 'approved', contentId })
}
