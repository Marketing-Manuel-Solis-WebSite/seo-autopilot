import { prisma } from '@/lib/prisma'
import { getAnthropic, MODELS } from '@/lib/claude/client'
import { withRetry } from '@/lib/utils/retry'
import { getSERPResults, type DFSSerpItem } from '@/lib/dataforseo/client'

export type SnippetFormat = 'paragraph' | 'list' | 'table' | 'faq' | 'none'

export interface SnippetOpportunity {
  exists: boolean
  format: SnippetFormat
  targetWordCount: number
  recommendedStructure: string
  estimatedImpact: 'high' | 'medium' | 'low'
}

export async function analyzeSnippetOpportunity(
  keyword: string,
  currentPosition: number,
  siteId: string,
): Promise<SnippetOpportunity | null> {
  if (currentPosition < 1 || currentPosition > 10) return null

  let topResults: string[] = []
  let hasSnippet = false
  try {
    const serpItems = await getSERPResults(keyword)
    hasSnippet = serpItems.some((i: DFSSerpItem) => i.type === 'featured_snippet')
    topResults = serpItems
      .filter((i: DFSSerpItem) => i.type === 'organic')
      .slice(0, 5)
      .map((i: DFSSerpItem) => `${i.title ?? ''} — ${i.url ?? ''}`)
  } catch {
    // Continue with empty results — Claude can still analyze the keyword
  }

  const response = await withRetry(
    () => getAnthropic().messages.create({
      model: MODELS.SONNET,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Analyze the featured snippet opportunity for the keyword "${keyword}".
Current position: #${currentPosition}
Featured snippet currently exists: ${hasSnippet ? 'Yes' : 'Unknown'}

Top SERP results:
${topResults.length > 0 ? topResults.map((r, i) => `${i + 1}. ${r}`).join('\n') : 'Not available'}

Determine:
1. Does a featured snippet likely exist for this keyword?
2. What format? (paragraph | list | table | faq | none)
3. What word count target for the snippet section?
4. What content structure would win the snippet?
5. Estimated impact if captured (high | medium | low)

Respond as JSON:
{
  "exists": boolean,
  "format": "paragraph"|"list"|"table"|"faq"|"none",
  "targetWordCount": number,
  "recommendedStructure": "description of the ideal structure",
  "estimatedImpact": "high"|"medium"|"low"
}`,
      }],
    }),
    { maxAttempts: 3, baseDelayMs: 1000, label: 'Claude Sonnet snippet analysis' },
  )

  const text = response.content.find(b => b.type === 'text')
  if (!text || text.type !== 'text') return null

  const clean = text.text.replace(/```json\n?|```\n?/g, '').trim()
  return JSON.parse(clean) as SnippetOpportunity
}

export async function generateSnippetOptimizedSection(
  content: { title: string; body: string; targetKeyword: string },
  opportunity: SnippetOpportunity,
): Promise<string> {
  const formatInstructions: Record<SnippetFormat, string> = {
    paragraph: 'Write a 40-60 word direct answer paragraph that concisely answers the query. Place it immediately after the H1.',
    list: 'Write a numbered or bulleted list with 5-8 specific items. Each item should be one clear sentence. Use an H2 heading as the question.',
    table: 'Create an HTML comparison table with 3-5 rows and 2-3 columns. Include a clear header row. Use an H2 heading.',
    faq: 'Create 3-5 Q&A pairs using proper FAQ schema. Each question as H3, answer as a concise paragraph (30-50 words).',
    none: 'No snippet optimization needed.',
  }

  if (opportunity.format === 'none') return ''

  const response = await withRetry(
    () => getAnthropic().messages.create({
      model: MODELS.OPUS,
      max_tokens: 2000,
      thinking: { type: 'enabled', budget_tokens: 3000 },
      messages: [{
        role: 'user',
        content: `Optimize this article section for a Google featured snippet.

KEYWORD: "${content.targetKeyword}"
ARTICLE TITLE: "${content.title}"
SNIPPET FORMAT: ${opportunity.format}
TARGET: ${opportunity.recommendedStructure}

INSTRUCTION: ${formatInstructions[opportunity.format]}

${opportunity.format === 'faq' ? `Also generate FAQPage JSON-LD schema for the Q&A pairs.
Include the schema in a <script type="application/ld+json"> block after the HTML.` : ''}

Return ONLY the HTML snippet section (not the full article). Keep it focused and concise.`,
      }],
    }),
    { maxAttempts: 3, baseDelayMs: 1000, label: 'Claude Opus snippet generation' },
  )

  const text = response.content.find(b => b.type === 'text')
  if (!text || text.type !== 'text') return ''

  return text.text.replace(/```html\n?|```\n?/g, '').trim()
}
