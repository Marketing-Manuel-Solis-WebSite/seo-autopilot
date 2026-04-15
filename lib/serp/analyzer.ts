import { getSERPResults, getKeywordData, type DFSSerpItem } from '@/lib/dataforseo/client'
import { getAnthropic, MODELS } from '@/lib/claude/client'
import { withRetry } from '@/lib/utils/retry'
import { safeParseJSON } from '@/lib/utils/helpers'

export interface SERPResult {
  position: number
  title: string
  url: string
  domain: string
}

export interface SERPAnalysis {
  top10Results: SERPResult[]
  dominantContentFormat: 'list' | 'article' | 'video' | 'mixed'
  averageWordCount: number
  featuredSnippetExists: boolean
  featuredSnippetFormat: 'paragraph' | 'list' | 'table' | null
  topCompetitorDomains: string[]
  contentGaps: string[]
}

export async function analyzeSERP(
  keyword: string,
  country: string = 'us',
  language: string = 'en',
): Promise<SERPAnalysis> {
  const [serpItems, kwData] = await Promise.all([
    getSERPResults(keyword, country, language),
    getKeywordData([keyword], country),
  ])

  const top10Results: SERPResult[] = serpItems
    .filter((item: DFSSerpItem) => item.type === 'organic')
    .slice(0, 10)
    .map((item: DFSSerpItem) => ({
      position: item.rank_absolute,
      title: item.title ?? '',
      url: item.url ?? '',
      domain: item.domain ?? '',
    }))

  const topCompetitorDomains = [...new Set(top10Results.map(r => r.domain).filter(Boolean))]
  const featuredSnippetExists = serpItems.some((i: DFSSerpItem) => i.type === 'featured_snippet')

  const analysis = await analyzeWithClaude(keyword, top10Results)

  return {
    top10Results,
    dominantContentFormat: analysis.dominantContentFormat,
    averageWordCount: analysis.averageWordCount,
    featuredSnippetExists,
    featuredSnippetFormat: analysis.featuredSnippetFormat,
    topCompetitorDomains,
    contentGaps: analysis.contentGaps,
  }
}

async function analyzeWithClaude(
  keyword: string,
  top10: SERPResult[],
): Promise<{
  dominantContentFormat: SERPAnalysis['dominantContentFormat']
  averageWordCount: number
  featuredSnippetExists: boolean
  featuredSnippetFormat: SERPAnalysis['featuredSnippetFormat']
  contentGaps: string[]
}> {
  const response = await withRetry(
    () => getAnthropic().messages.create({
      model: MODELS.SONNET,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Analyze the SERP for the keyword "${keyword}". These are the top 10 organic results:

${top10.map((r, i) => `${i + 1}. ${r.title} — ${r.url}`).join('\n')}

Based on the titles and URLs, determine:
1. The dominant content format (list, article, video, or mixed)
2. Estimated average word count for this type of content
3. Whether a featured snippet likely exists for this query
4. If yes, what format (paragraph, list, or table)
5. Content gaps — topics or angles NOT covered by the top 10 that would differentiate a new article

Respond as JSON:
{
  "dominantContentFormat": "list"|"article"|"video"|"mixed",
  "averageWordCount": number,
  "featuredSnippetExists": boolean,
  "featuredSnippetFormat": "paragraph"|"list"|"table"|null,
  "contentGaps": ["string"]
}`,
        },
      ],
    }),
    { maxAttempts: 3, baseDelayMs: 1000, label: 'Claude Sonnet SERP analysis' },
  )

  const text = response.content.find(b => b.type === 'text')
  if (!text || text.type !== 'text') {
    return {
      dominantContentFormat: 'article',
      averageWordCount: 1500,
      featuredSnippetExists: false,
      featuredSnippetFormat: null,
      contentGaps: [],
    }
  }

  try {
    return safeParseJSON(text.text, 'SERP analysis')
  } catch {
    return {
      dominantContentFormat: 'article' as const,
      averageWordCount: 1500,
      featuredSnippetExists: false,
      featuredSnippetFormat: null,
      contentGaps: [],
    }
  }
}
