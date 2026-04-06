import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { runHourlyMonitor } from '@/lib/monitoring/site-monitor'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId } = await request.json()

  const result = await runHourlyMonitor(siteId)
  return NextResponse.json(result)
}
