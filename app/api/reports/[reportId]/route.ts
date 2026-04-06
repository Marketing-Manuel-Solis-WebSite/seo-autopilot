import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { reportId } = await params

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { site: { select: { name: true, domain: true } } },
  })

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  return NextResponse.json(report)
}
