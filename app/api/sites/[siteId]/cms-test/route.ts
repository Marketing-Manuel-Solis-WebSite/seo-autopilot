import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId } = await params

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { cmsType: true, cmsApiUrl: true, cmsApiKey: true, domain: true },
  })

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  if (!site.cmsType || !site.cmsApiUrl || !site.cmsApiKey) {
    return NextResponse.json({
      connected: false,
      error: 'CMS credentials not configured. Add them in Settings.',
    })
  }

  try {
    let testUrl: string
    let headers: Record<string, string>

    if (site.cmsType === 'wordpress') {
      testUrl = `${site.cmsApiUrl}/wp-json/wp/v2/posts?per_page=1`
      headers = { Authorization: `Basic ${Buffer.from(site.cmsApiKey).toString('base64')}` }
    } else if (site.cmsType === 'webflow') {
      testUrl = `https://api.webflow.com/v2/collections/${site.cmsApiUrl}`
      headers = { Authorization: `Bearer ${site.cmsApiKey}` }
    } else {
      testUrl = `${site.cmsApiUrl}/posts?limit=1`
      headers = { Authorization: `Bearer ${site.cmsApiKey}` }
    }

    const res = await fetch(testUrl, { headers, signal: AbortSignal.timeout(10000) })

    if (res.ok) {
      return NextResponse.json({ connected: true, cmsType: site.cmsType, status: res.status })
    }

    return NextResponse.json({
      connected: false,
      error: `CMS returned ${res.status}: ${res.statusText}`,
    })
  } catch (err) {
    return NextResponse.json({
      connected: false,
      error: `Connection failed: ${(err as Error).message}`,
    })
  }
}
