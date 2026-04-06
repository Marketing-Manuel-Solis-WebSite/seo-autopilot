import { NextResponse } from 'next/server'
import { getCompetitorDomains } from '@/lib/dataforseo/client'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { domain, database } = await request.json()
  const data = await getCompetitorDomains(domain, database)
  return NextResponse.json(data)
}
