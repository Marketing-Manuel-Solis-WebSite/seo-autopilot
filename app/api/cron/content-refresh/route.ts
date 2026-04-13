import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { detectStaleContent, refreshContent } from '@/lib/seo/content-refresh'
import { triggerAlert } from '@/lib/monitoring/alert-engine'
import pLimit from 'p-limit'

const MAX_REFRESHES_PER_SITE = 2
const MAX_CONCURRENT_SITES = 3

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sites = await prisma.site.findMany({
    where: { isActive: true },
    select: { id: true, domain: true, name: true, targetCountry: true },
  })

  const limit = pLimit(MAX_CONCURRENT_SITES)

  const results = await Promise.allSettled(
    sites.map(site => limit(() => processSite(site)))
  )

  const summary = results.map((r, i) => ({
    domain: sites[i].domain,
    status: r.status,
    data: r.status === 'fulfilled' ? r.value : undefined,
    error: r.status === 'rejected' ? String(r.reason) : undefined,
  }))

  // Cron failure alerting
  const rejected = results.filter(r => r.status === 'rejected')
  if (rejected.length > 0) {
    await triggerAlert({
      siteId: sites[0]?.id ?? 'system',
      alertType: 'cron_failure',
      severity: rejected.length === sites.length ? 'critical' : 'warning',
      title: `content-refresh: ${rejected.length}/${sites.length} sites failed`,
      message: summary.filter(s => s.error).map(s => `${s.domain}: ${s.error}`).join('\n'),
    })
  }

  // Aggregate stale content alert
  const totalStale = summary.reduce((sum, s) => sum + (s.data?.totalStale ?? 0), 0)
  const sitesWithStale = summary.filter(s => s.data && s.data.totalStale > 0).length
  if (totalStale > 0) {
    await triggerAlert({
      siteId: sites[0]?.id ?? 'system',
      alertType: 'stale_content',
      severity: 'warning',
      title: `${totalStale} articles need refreshing across ${sitesWithStale} sites`,
      message: summary
        .filter(s => s.data && s.data.totalStale > 0)
        .map(s => `${s.domain}: ${s.data!.totalStale} stale, ${s.data!.refreshed} refreshed`)
        .join('\n'),
    })
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results: summary,
  })
}

async function processSite(site: { id: string; domain: string; name: string; targetCountry: string }) {
  const staleContent = await detectStaleContent(site.id)

  if (staleContent.length === 0) {
    return { totalStale: 0, refreshed: 0 }
  }

  const toRefresh = staleContent.slice(0, MAX_REFRESHES_PER_SITE)
  let refreshed = 0

  for (const content of toRefresh) {
    try {
      await refreshContent(content, site.targetCountry)
      refreshed++
    } catch (err) {
      console.error(`Content refresh failed for "${content.title}" on ${site.domain}:`, err)
    }
  }

  return { totalStale: staleContent.length, refreshed }
}
