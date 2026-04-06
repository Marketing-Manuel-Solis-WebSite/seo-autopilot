import { NextResponse } from 'next/server'
import { getBacklinksSummary } from '@/lib/dataforseo/client'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { domain } = await request.json()
  const data = await getBacklinksSummary(domain)
  return NextResponse.json(data)
}
