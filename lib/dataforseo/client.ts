import { getRedis } from '@/lib/upstash/redis'
import { withRetry } from '@/lib/utils/retry'

const BASE = 'https://api.dataforseo.com/v3'

function getAuth(): string {
  const login = process.env.DATAFORSEO_LOGIN!
  const pass = process.env.DATAFORSEO_PASSWORD!
  return 'Basic ' + Buffer.from(`${login}:${pass}`).toString('base64')
}

async function dfsFetch(endpoint: string, body: unknown): Promise<unknown> {
  const cacheKey = `dfs:${endpoint}:${JSON.stringify(body)}`.slice(0, 256)
  const redis = getRedis()

  try {
    const cached = await redis.get<string>(cacheKey)
    if (cached) return JSON.parse(cached)
  } catch {}

  const data = await withRetry(
    async () => {
      const res = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: getAuth() },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`DataForSEO ${res.status}: ${await res.text()}`)
      return res.json()
    },
    { maxAttempts: 3, baseDelayMs: 2000, label: 'DataForSEO API' },
  )

  try { await redis.setex(cacheKey, 86400, JSON.stringify(data)) } catch {}
  return data
}

export interface DFSSerpItem {
  rank_absolute: number
  title: string
  url: string
  domain: string
  description: string
  type: string
}

export async function getSERPResults(keyword: string, country = 'us', language = 'en'): Promise<DFSSerpItem[]> {
  const data = await dfsFetch('/serp/google/organic/live/advanced', [{
    keyword,
    location_code: countryToCode(country),
    language_code: language,
    depth: 10,
  }]) as { tasks?: Array<{ result?: Array<{ items?: DFSSerpItem[] }> }> }
  return data?.tasks?.[0]?.result?.[0]?.items ?? []
}

export interface DFSKeywordData {
  keyword: string
  search_volume: number
  competition: number
  competition_index: number
  cpc: number
}

export async function getKeywordData(keywords: string[], country = 'us'): Promise<DFSKeywordData[]> {
  const data = await dfsFetch('/keywords_data/google_ads/search_volume/live', [{
    keywords,
    location_code: countryToCode(country),
    language_code: 'en',
  }]) as { tasks?: Array<{ result?: DFSKeywordData[] }> }
  return data?.tasks?.[0]?.result ?? []
}

export interface DFSCompetitor {
  domain: string
  avg_position: number
  sum_position: number
  intersections: number
  full_domain_metrics?: { organic?: { count?: number; estimated_paid_traffic_cost?: number } }
}

export async function getCompetitorDomains(domain: string, country = 'us'): Promise<DFSCompetitor[]> {
  const data = await dfsFetch('/dataforseo_labs/google/competitors_domain/live', [{
    target: domain,
    location_code: countryToCode(country),
    language_code: 'en',
    limit: 10,
  }]) as { tasks?: Array<{ result?: Array<{ items?: DFSCompetitor[] }> }> }
  return data?.tasks?.[0]?.result?.[0]?.items ?? []
}

export interface DFSBacklinksSummary {
  total_backlinks: number
  referring_domains: number
  broken_backlinks: number
  referring_domains_nofollow: number
  rank: number
}

export async function getBacklinksSummary(domain: string): Promise<DFSBacklinksSummary> {
  const data = await dfsFetch('/backlinks/summary/live', [{
    target: domain,
    include_subdomains: true,
  }]) as { tasks?: Array<{ result?: DFSBacklinksSummary[] }> }
  return data?.tasks?.[0]?.result?.[0] ?? {} as DFSBacklinksSummary
}

function countryToCode(country: string): number {
  const map: Record<string, number> = {
    us: 2840, mx: 2484, es: 2724, ar: 2032,
    co: 2170, cl: 2152, pe: 2604, uk: 2826,
    de: 2276, fr: 2250, br: 2076, it: 2380,
  }
  return map[country.toLowerCase()] ?? 2840
}
