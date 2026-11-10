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
