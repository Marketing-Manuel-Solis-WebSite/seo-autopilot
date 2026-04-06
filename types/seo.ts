export interface SemrushKeywordData {
  keyword: string
  position: number
  previousPosition?: number
  searchVolume: number
  cpc: number
  url: string
  traffic: number
  trafficCost: number
  competition: number
  trends: string
}

export interface CompetitorData {
  domain: string
  visibilityScore: number
  commonKeywords: number
  organicKeywords: number
  organicTraffic: number
}

export interface BacklinkData {
  sourceUrl: string
  targetUrl: string
  anchorText: string
  domainAuthority: number
  isDoFollow: boolean
}
