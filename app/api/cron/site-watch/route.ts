import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { triggerAlert } from '@/lib/monitoring/alert-engine'
import { getRepoActivity, repoForDomain } from '@/lib/sites/connections'

/**
 * Hourly live watch of every site: is it answering, how fast, and what
 * changed in its repository. No AI and no paid APIs, so it runs for every
 * site regardless of the heavier automatic monitoring.
 *
 * A 429 with `x-vercel-mitigated` is Vercel's bot checkpoint answering for a
 * live site, so it counts as online.
 */
export const maxDuration = 60

async function checkSite(url: string) {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: { 'User-Agent': 'SolisSEO-SiteWatch/1.0' },
      signal: AbortSignal.timeout(15000),
    })
    const ms = Date.now() - started
    const mitigated = res.headers.get('x-vercel-mitigated')
    const online = res.status < 500 && (res.status !== 429 || Boolean(mitigated))
    return { online, httpStatus: res.status, responseMs: ms, protectedByFirewall: Boolean(mitigated) }
  } catch (err) {
    return { online: false, httpStatus: 0, responseMs: Date.now() - started, error: (err as Error).message }
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sites = await prisma.site.findMany({ select: { id: true, name: true, domain: true, url: true } })
  const results = []

  for (const site of sites) {
    const started = Date.now()
    const http = await checkSite(site.url)
    const repo = repoForDomain(site.domain)
    const activity = repo ? await getRepoActivity(repo, 10) : null
    const since = Date.now() - 24 * 60 * 60 * 1000
    const latest = activity?.ok ? activity.commits[0] : undefined
    const summary = {
      online: http.online,
      httpStatus: http.httpStatus,
      responseMs: http.responseMs,
      protectedByFirewall: 'protectedByFirewall' in http ? http.protectedByFirewall : false,
      repo,
      repoOk: activity?.ok ?? null,
      latestCommit: latest ? { sha: latest.sha, message: latest.message, date: latest.date, agent: latest.agent } : null,
      commits24h: activity?.ok ? activity.commits.filter(c => new Date(c.date).getTime() >= since).length : null,
    }

    await prisma.monitoringLog.create({
      data: {
        siteId: site.id,
        runType: 'site_watch',
        model: 'monitoreo en vivo',
        durationMs: Date.now() - started,
        status: http.online ? 'success' : 'error',
        summary,
        error: http.online ? null : ('error' in http ? http.error : `HTTP ${http.httpStatus}`) ?? null,
      },
    })

    if (!http.online) {
      await triggerAlert({
        siteId: site.id,
        alertType: 'site_down',
        severity: 'critical',
        title: `${site.domain} no responde`,
        message: `La revisión en vivo recibió ${http.httpStatus || 'ninguna respuesta'} en ${http.responseMs} ms.`,
      })
    }

    results.push({ site: site.domain, ...summary })
  }

  return NextResponse.json({ checkedAt: new Date().toISOString(), results })
}
