import { NextResponse } from 'next/server'
import { getBacklinksSummary } from '@/lib/dataforseo/client'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { domain } = await request.json()
    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 })
    }
    const data = await getBacklinksSummary(domain)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[Semrush Backlinks]', err)
    return NextResponse.json({ error: 'Error fetching backlinks' }, { status: 500 })
  }
}
