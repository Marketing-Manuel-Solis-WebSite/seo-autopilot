import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

async function getOAuthClient(siteId: string) {
  const site = await prisma.site.findUniqueOrThrow({
    where: { id: siteId },
    select: { gscCredentials: true, gscPropertyUrl: true },
  })
  if (!site.gscCredentials) throw new Error(`No GSC credentials for site ${siteId}`)

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )
  auth.setCredentials(site.gscCredentials as Record<string, unknown>)

  auth.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await prisma.site.update({
        where: { id: siteId },
        data: { gscCredentials: { ...(site.gscCredentials as object), ...tokens } as never },
      })
    }
  })
  return { auth, propertyUrl: site.gscPropertyUrl! }
}

export interface GSCRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export async function getSearchAnalytics(siteId: string, options: {
  startDate: string
  endDate: string
  dimensions?: string[]
  rowLimit?: number
}): Promise<GSCRow[]> {
  const { auth, propertyUrl } = await getOAuthClient(siteId)
  const sc = google.searchconsole({ version: 'v1', auth })

  const res = await sc.searchanalytics.query({
    siteUrl: propertyUrl,
    requestBody: {
      startDate: options.startDate,
      endDate: options.endDate,
      dimensions: options.dimensions ?? ['query', 'page'],
      rowLimit: options.rowLimit ?? 500,
    },
  })
  return (res.data.rows ?? []) as GSCRow[]
}

export async function getCoreWebVitals(siteId: string) {
  const { auth, propertyUrl } = await getOAuthClient(siteId)
  const sc = google.searchconsole({ version: 'v1', auth })
  const res = await sc.urlInspection.index.inspect({
    requestBody: {
      inspectionUrl: propertyUrl,
      siteUrl: propertyUrl,
    },
  })
  return res.data.inspectionResult ?? {}
}

export async function getIndexingStatus(siteId: string) {
  const { auth, propertyUrl } = await getOAuthClient(siteId)
  const sc = google.searchconsole({ version: 'v1', auth })
  const res = await sc.sitemaps.list({ siteUrl: propertyUrl })
  return res.data.sitemap ?? []
}

export function getDateRange(daysBack: number): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - daysBack)
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

export function isGSCConfigured(site: { gscPropertyUrl: string | null; gscCredentials: unknown }): boolean {
  return !!(site.gscPropertyUrl && site.gscCredentials)
}
