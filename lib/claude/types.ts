export interface ClaudeAnalysisResult {
  executiveSummary: string
  seoHealthScore: number
  criticalIssues: Array<{
    title: string
    impact: string
    fix: string
    priority: 'critical' | 'high' | 'medium' | 'low'
  }>
  rankingProtectionActions: Array<{
    keyword: string
    risk: string
    action: string
    urgency: 'immediate' | 'high' | 'medium' | 'low'
  }>
  contentOpportunities: Array<{
    topic: string
    keyword: string
    volume: number
    difficulty: number
    intent: string
    estimatedTraffic: number
  }>
  technicalFixes: Array<{
    issue: string
    affectedUrls: string[]
    fix: string
    isDestructive: boolean
    rollbackPlan: string
    priority?: string
  }>
  competitorGaps: Array<{
    competitor: string
    keyword: string
    ourPosition: number
    theirPosition: number
    action: string
  }>
  monthlyContentPlan: Array<{
    week: number
    contentType: string
    title: string
    keyword: string
    targetUrl: string
  }>
  estimatedTrafficGain: string
}

export interface MonitorResult {
  status: 'ok' | 'warning' | 'critical'
  issues: string[]
  opportunities: string[]
  rankingAlerts: string[]
  recommendedActions: Array<{
    action: string
    priority: 'high' | 'medium' | 'low'
    isDestructive: boolean
  }>
}

export interface ContentGenerationResult {
  title: string
  slug: string
  metaTitle: string
  metaDescription: string
  body: string
  schema: Record<string, unknown>
  internalLinkSuggestions: string[]
  estimatedReadTime: string
  seoScore: number
}

export interface FixSuggestionResult {
  fixTitle: string
  currentValue: string
  proposedValue: string
  explanation: string
  isDestructive: boolean
  estimatedImpact: 'high' | 'medium' | 'low'
  implementation: string
}
