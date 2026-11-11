import { getDateRange, getSearchAnalytics, isGSCConfigured } from '@/lib/gsc/client'

/**
 * Read-only connections of a site to its sources of truth.
 *
 * The repository link is display-only on purpose: it is not a CMS adapter, so
 * nothing in the app can publish to the live site through it.
 */
const SITE_REPOS: Record<string, string> = {
  'manuelsolis.com': 'Marketing-Manuel-Solis-WebSite/manuelsolis',
}

export function repoForDomain(domain: string): string | null {
  return SITE_REPOS[domain.replace(/^www\./, '')] ?? null
}

export interface RepoCommit {
  sha: string
  message: string
  date: string
  url: string
  agent: boolean
}

export type RepoActivity =
  | { ok: true; repo: string; commits: RepoCommit[] }
  | { ok: false; repo: string; reason: string }

export async function getRepoActivity(repo: string, limit = 8): Promise<RepoActivity> {
  const token = process.env.GITHUB_TOKEN
  if (!token) return { ok: false, repo, reason: 'Falta GITHUB_TOKEN' }
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'solis-seo-autopilot',
      },
      next: { revalidate: 600 },
    })
    if (!res.ok) return { ok: false, repo, reason: `GitHub respondió ${res.status}` }
    const rows = (await res.json()) as Array<{
      sha: string
      html_url: string
      commit: { message: string; author: { name: string; date: string } | null }
    }>
    return {
      ok: true,
      repo,
      commits: rows.map(r => ({
        sha: r.sha.slice(0, 7),
        message: r.commit.message.split('\n')[0],
        date: r.commit.author?.date ?? '',
        url: r.html_url,
        agent: /Co-Authored-By:\s*Claude|noreply@anthropic\.com/i.test(r.commit.message) || r.commit.author?.name === 'Claude',
      })),
    }
  } catch (err) {
    return { ok: false, repo, reason: (err as Error).message }
  }
}

export interface LiveGscSummary {
  clicks: number
  impressions: number
  ctr: number
  position: number
  startDate: string
  endDate: string
}

/** Last 28 days from Search Console, live, when the site is connected. */
export async function getLiveGscSummary(site: {
  id: string
  gscPropertyUrl: string | null
  gscCredentials: unknown
}): Promise<LiveGscSummary | { error: string } | null> {
  if (!isGSCConfigured(site)) return null
  try {
    const range = getDateRange(28)
    const rows = await getSearchAnalytics(site.id, { ...range, dimensions: ['date'], rowLimit: 100 })
    const clicks = rows.reduce((s, r) => s + r.clicks, 0)
    const impressions = rows.reduce((s, r) => s + r.impressions, 0)
    const position = impressions ? rows.reduce((s, r) => s + r.position * r.impressions, 0) / impressions : 0
    return { clicks, impressions, ctr: impressions ? (clicks / impressions) * 100 : 0, position, ...range }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export interface LiveWatch {
  checkedAt: Date
  minutesAgo: number
  online: boolean
  responseMs: number | null
  httpStatus: number | null
  protectedByFirewall: boolean
}

/** Latest hourly live check of a site (cron /api/cron/site-watch), if recent. */
export async function getLiveWatch(siteId: string): Promise<LiveWatch | null> {
  const { prisma } = await import('@/lib/prisma')
  const log = await prisma.monitoringLog.findFirst({
    where: { siteId, runType: 'site_watch' },
    orderBy: { createdAt: 'desc' },
  })
  if (!log) return null
  const s = (log.summary ?? {}) as { online?: boolean; responseMs?: number; httpStatus?: number; protectedByFirewall?: boolean }
  const minutesAgo = Math.max(0, Math.round((Date.now() - log.createdAt.getTime()) / 60000))
  if (minutesAgo > 180) return null
  return {
    checkedAt: log.createdAt,
    minutesAgo,
    online: s.online ?? log.status === 'success',
    responseMs: s.responseMs ?? null,
    httpStatus: s.httpStatus ?? null,
    protectedByFirewall: Boolean(s.protectedByFirewall),
  }
}

export function agoLabel(minutes: number): string {
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const h = Math.round(minutes / 60)
  return `hace ${h} h`
}
