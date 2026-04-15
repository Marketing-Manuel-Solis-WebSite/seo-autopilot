import { getAnthropic, MODELS } from './client'
import { buildAuditAnalysisPrompt } from './prompts/audit-analysis'
import { buildContentGenerationPrompt } from './prompts/content-generation'
import type { ClaudeAnalysisResult, ContentGenerationResult } from './types'
import type { SERPAnalysis } from '@/lib/serp/analyzer'
import type { TopicMap } from '@/lib/seo/topical-authority'
import { withRetry } from '@/lib/utils/retry'
import { logClaudeCost } from '@/lib/costs/tracker'
import { safeParseJSON } from '@/lib/utils/helpers'

export interface OpusAnalysisInput {
  siteData: { domain: string; name: string }
  auditData: unknown
  rankingHistory: unknown
  competitors: unknown
  instruction: string
}

export async function claudeOpusDeepAnalysis(input: OpusAnalysisInput): Promise<ClaudeAnalysisResult> {
  const prompt = buildAuditAnalysisPrompt(
    input.siteData,
    input.auditData,
    input.rankingHistory,
    input.competitors,
  )

  const response = await withRetry(
    () => getAnthropic().messages.create({
      model: MODELS.OPUS,
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      messages: [{ role: 'user', content: prompt }],
    }),
    { maxAttempts: 3, baseDelayMs: 1000, label: 'Claude Opus deep analysis' },
  )

  logClaudeCost('claude-opus', response.usage.input_tokens, response.usage.output_tokens, 'deep-analysis')

  const textContent = response.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Claude Opus did not return text content')
  }

  return safeParseJSON<ClaudeAnalysisResult>(textContent.text, 'Claude Opus deep analysis')
}

export async function claudeOpusGenerateContent(input: {
  siteContext: unknown
  contentBrief: unknown
  targetKeyword: string
  contentType: string
  wordCount: number
  serpAnalysis?: SERPAnalysis
  topicMapContext?: { pillarOpportunities: TopicMap['pillarOpportunities']; clusters: TopicMap['clusters'] }
}): Promise<ContentGenerationResult> {
  const prompt = buildContentGenerationPrompt(input)

  const response = await withRetry(
    () => getAnthropic().messages.create({
      model: MODELS.OPUS,
      max_tokens: 8000,
      thinking: {
        type: 'enabled',
        budget_tokens: 5000,
      },
      messages: [{ role: 'user', content: prompt }],
    }),
    { maxAttempts: 3, baseDelayMs: 1000, label: 'Claude Opus content generation' },
  )

  logClaudeCost('claude-opus', response.usage.input_tokens, response.usage.output_tokens, 'content-generation')

  const textContent = response.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Claude Opus did not return text content')
  }

  return safeParseJSON<ContentGenerationResult>(textContent.text, 'Claude Opus content generation')
}
