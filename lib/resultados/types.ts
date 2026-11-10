/** Shape of Report.data for reportType = 'resultados_seo'. */

export interface ResultadosMonth {
  /** YYYY-MM */
  month: string
  gscClicks: number
  gscImpressions: number
  gscCtr: number
  gscPosition?: number
  urlsWithImpressions?: number
  ga4SessionsWww?: number
  ga4OrganicWww?: number
  engagementWww?: number | null
  commits: number
  /** Commits signed by the AI agent (Co-Authored-By: Claude) */
  agentCommits?: number
  newPages: number
  newLandings: number
  postsPublished: number
  postsScheduled?: number
  /** Days of Search Console data in the month, when it is not the whole month */
  gscDays?: number
  /** Human labels for partial windows, e.g. { ga4: '1–27 oct' } */
  partial?: { gsc: string | null; ga4: string; urls: string }
}

export interface ResultadosContacts {
  month: string
  phone: number
  whatsapp: number
  consulta: number
  form: number
  days: number
  /** Last day with data, YYYY-MM-DD */
  through: string
}

export interface ResultadosDaily {
  date: string
  clicks: number
  impressions: number
}

export interface ResultadosMilestone {
  month: string
  items: string[]
}

export interface ResultadosData {
  site: string
  /** YYYY-MM-DD the numbers were loaded */
  updatedAt: string
  months: ResultadosMonth[]
  contacts: ResultadosContacts[]
  daily: ResultadosDaily[]
  milestones: ResultadosMilestone[]
  sources: string[]
}

/** Shape of Report.data for reportType = 'mensual_seo' (one per month). */
export interface MonthlyReportData {
  month: string
  /** One-line justification of the month */
  headline: string
  metrics: Partial<ResultadosMonth>
  previous: Partial<ResultadosMonth> & { month: string }
  contacts?: ResultadosContacts | null
  work: { category: string; items: string[] }[]
  agent: { commits: number; agentCommits: number; highlights: string[] }
  note?: string | null
  site: string
  updatedAt: string
  /** The standout numbers of the month */
  highlights?: { value: string; label: string; detail: string }[]
  /** What was uploaded to the site that month, with its Google performance (12 months to 25 oct) */
  uploads?: MonthlyUploads
}

export interface UploadedPost {
  title: string
  url: string
  date: string
  clicks: number
  impressions: number
  scheduled: boolean
}

export interface UploadedPage {
  path: string
  url: string
  kind: string
  clicks: number
  impressions: number
}

export interface MonthlyUploads {
  posts: UploadedPost[]
  pages: UploadedPage[]
  postsClicks: number
  postsImpressions: number
  pagesClicks: number
  pagesImpressions: number
}

export const MONTH_SHORT: Record<string, string> = {
  '01': 'ene', '02': 'feb', '03': 'mar', '04': 'abr', '05': 'may', '06': 'jun',
  '07': 'jul', '08': 'ago', '09': 'sep', '10': 'oct', '11': 'nov', '12': 'dic',
}

export const MONTH_LONG: Record<string, string> = {
  '01': 'enero', '02': 'febrero', '03': 'marzo', '04': 'abril', '05': 'mayo', '06': 'junio',
  '07': 'julio', '08': 'agosto', '09': 'septiembre', '10': 'octubre', '11': 'noviembre', '12': 'diciembre',
}

export function monthShort(ym: string): string {
  return MONTH_SHORT[ym.slice(5, 7)] ?? ym
}

export function monthLong(ym: string): string {
  return MONTH_LONG[ym.slice(5, 7)] ?? ym
}

/** Shape of Report.data for reportType = 'semanal_seo' (one per Monday–Sunday week). */
export interface WeeklyReportData {
  start: string
  end: string
  label: string
  headline: string
  clicks: number
  impressions: number
  ctr: number
  position: number | null
  bestDay: { date: string; clicks: number }
  days: { date: string; clicks: number; impressions: number }[]
  commits: number
  agentCommits: number
  changes: { date: string; subject: string; agent: boolean }[]
  posts: { title: string; url: string; date: string }[]
  contacts: { phone: number; whatsapp: number; consulta: number; form: number } | null
  previous: { clicks: number; impressions: number; position: number | null; label: string } | null
}

export interface MetricRow {
  key: string
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
  sessions?: number
  users?: number
  engagement?: number
}

/** Shape of Report.data for reportType = 'analisis_busqueda'. */
export interface SearchAnalysisData {
  period: string
  totals: { clicks12m: number; impressions12m: number; clicks3m: number; impressions3m: number; clicksPrev3m: number; impressionsPrev3m: number }
  queries12m: MetricRow[]
  queries3m: MetricRow[]
  opportunities: MetricRow[]
  pages3m: MetricRow[]
  countries3m: MetricRow[]
  devices3m: MetricRow[]
  channels: MetricRow[]
  sources: MetricRow[]
  gaDevices: MetricRow[]
  gaCountries: MetricRow[]
  locations: { name: string; city: string; state: string; hours: string; kind: string; hasGbp: boolean }[]
}
