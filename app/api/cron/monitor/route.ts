import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runHourlyMonitor } from '@/lib/monitoring/site-monitor'
import { triggerAlert } from '@/lib/monitoring/alert-engine'
import pLimit from 'p-limit'

const CONCURRENT_SITES = 5
const APPROVAL_STALE_HOURS = 48

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sites = await prisma.site.findMany({
    where: { isActive: true },
    select: { id: true, domain: true, name: true },
  })

  const limit = pLimit(CONCURRENT_SITES)

  const results = await Promise.allSettled(
    sites.map(site => limit(() => runHourlyMonitor(site.id)))
  )

  const summary = results.map((result, i) => ({
    siteId: sites[i].id,
    domain: sites[i].domain,
    status: result.status,
    data: result.status === 'fulfilled' ? result.value : (result.reason as Error)?.message,
  }))

  // Cron failure alerting
  const rejected = results.filter(r => r.status === 'rejected')
  if (rejected.length > 0) {
    await triggerAlert({
      siteId: sites[0]?.id ?? 'system',
      alertType: 'cron_failure',
      severity: rejected.length === sites.length ? 'critical' : 'warning',
      title: `monitor: ${rejected.length}/${sites.length} sites failed`,
      message: summary
        .filter(s => s.status === 'rejected')
        .map(s => `${s.domain}: ${s.data}`)
        .join('\n'),
    })
  }

  // Approval expiry reminder — check for stale pending items (daily digest via deduplication)
  try {
    const staleThreshold = new Date(Date.now() - APPROVAL_STALE_HOURS * 60 * 60 * 1000)

    const [staleContent, staleFixes] = await Promise.all([
      prisma.content.count({
        where: { status: 'pending_approval', updatedAt: { lte: staleThreshold } },
      }),
      prisma.fix.count({
        where: { status: 'pending_approval', createdAt: { lte: staleThreshold } },
      }),
    ])

    if (staleContent > 0 || staleFixes > 0) {
      await triggerAlert({
        siteId: sites[0]?.id ?? 'system',
        alertType: 'approval_stale',
        severity: 'warning',
        title: `${staleContent} articles and ${staleFixes} fixes have been waiting for approval for 2+ days`,
        message: `Review pending items in the dashboard. ${staleContent} content items and ${staleFixes} fixes need attention.`,
      })
    }
  } catch (err) {
    console.error('Approval expiry check failed:', err)
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    sitesMonitored: sites.length,
    summary,
  })
}
