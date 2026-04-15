import { NextResponse } from 'next/server'
import { getCompetitorDomains } from '@/lib/dataforseo/client'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { domain, database } = await request.json()
    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 })
    }
    const data = await getCompetitorDomains(domain, database)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[Semrush Competitors]', err)
    return NextResponse.json({ error: 'Error fetching competitors' }, { status: 500 })
  }
}
