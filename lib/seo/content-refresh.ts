import { prisma } from '@/lib/prisma'
import { claudeOpusGenerateContent } from '@/lib/claude/opus'
import { analyzeSERP } from '@/lib/serp/analyzer'
import { getAnthropic, MODELS } from '@/lib/claude/client'
import { withRetry } from '@/lib/utils/retry'
import { countWordsInHTML } from '@/lib/utils/helpers'

export interface StaleContent {
  contentId: string
  title: string
  targetKeyword: string
  publishedAt: Date
  publishedUrl: string | null
  currentPosition: number | null
  positionAtPublish: number | null
  rankDrop: number
  daysSincePublish: number
  body: string
  siteId: string
}

export async function detectStaleContent(siteId: string): Promise<StaleContent[]> {
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

  const published = await prisma.content.findMany({
    where: {
      siteId,
      status: 'published',
      publishedAt: { lt: sixMonthsAgo },
    },
    select: {
      id: true,
      title: true,
      targetKeyword: true,
      publishedAt: true,
      publishedUrl: true,
      body: true,
      siteId: true,
    },
    orderBy: { publishedAt: 'asc' },
  })

  const staleItems: StaleContent[] = []

  for (const content of published) {
    // Get current ranking for target keyword
    const currentRanking = await prisma.ranking.findFirst({
      where: { siteId, keywordText: content.targetKeyword },
      orderBy: { checkedAt: 'desc' },
    })

    // Get ranking closest to publish date
    const publishRanking = content.publishedAt
      ? await prisma.ranking.findFirst({
          where: {
            siteId,
            keywordText: content.targetKeyword,
            checkedAt: {
              gte: new Date(content.publishedAt.getTime() - 7 * 24 * 60 * 60 * 1000),
              lte: new Date(content.publishedAt.getTime() + 14 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { checkedAt: 'asc' },
        })
      : null

    const currentPos = currentRanking?.position ?? null
    const publishPos = publishRanking?.position ?? null
    const rankDrop = publishPos && currentPos ? currentPos - publishPos : 0 // positive = dropped
    const daysSincePublish = content.publishedAt
      ? Math.floor((Date.now() - content.publishedAt.getTime()) / (24 * 60 * 60 * 1000))
      : 999

    const isStale =
      rankDrop >= 3 ||
      (daysSincePublish >= 180 && (currentPos === null || currentPos > 3))

    if (isStale) {
      staleItems.push({
        contentId: content.id,
        title: content.title,
        targetKeyword: content.targetKeyword,
        publishedAt: content.publishedAt!,
        publishedUrl: content.publishedUrl,
        currentPosition: currentPos,
        positionAtPublish: publishPos,
        rankDrop,
        daysSincePublish,
        body: content.body,
        siteId: content.siteId,
      })
    }
  }

  return staleItems.sort((a, b) => b.rankDrop - a.rankDrop)
}

export async function refreshContent(
  content: StaleContent,
  targetCountry: string,
): Promise<{ refreshedBody: string }> {
  // Get fresh SERP analysis
  let serpAnalysis
  try {
    serpAnalysis = await analyzeSERP(content.targetKeyword, targetCountry)
  } catch {
    // Continue without SERP data
  }

  const serpContext = serpAnalysis
    ? `\nCurrent top 10 for "${content.targetKeyword}":\n${serpAnalysis.top10Results.map((r, i) => `${i + 1}. ${r.title}`).join('\n')}\nContent gaps competitors cover that we don't: ${serpAnalysis.contentGaps.join(', ')}`
    : ''

  const response = await withRetry(
    () => getAnthropic().messages.create({
      model: MODELS.OPUS,
      max_tokens: 8000,
      thinking: { type: 'enabled', budget_tokens: 5000 },
      messages: [{
        role: 'user',
        content: `Refresh this SEO article. It was published on ${content.publishedAt.toISOString().slice(0, 10)} (${content.daysSincePublish} days ago).
It currently ranks #${content.currentPosition ?? 'unknown'} for "${content.targetKeyword}".
${content.positionAtPublish ? `When published it ranked #${content.positionAtPublish} — it has dropped ${content.rankDrop} positions.` : ''}
${serpContext}

ORIGINAL ARTICLE HTML:
${content.body.slice(0, 12000)}

REFRESH INSTRUCTIONS:
1. Update any statistics, dates, or time-sensitive information to current (2026)
2. Add sections covering topics competitors now include that we don't
3. Improve the intro for better CTR and engagement
4. Strengthen or add a featured snippet section
5. Keep the original structure, headings hierarchy, and internal links intact
6. Do NOT remove existing internal links (<a> tags)
7. Expand thin sections, add depth where competitors are more comprehensive

Return the COMPLETE refreshed HTML body. No JSON wrapper — just raw HTML.`,
      }],
    }),
    { maxAttempts: 3, baseDelayMs: 1000, label: 'Claude Opus content refresh' },
  )

  const text = response.content.find(b => b.type === 'text')
  if (!text || text.type !== 'text') {
    throw new Error('Claude Opus did not return text content for refresh')
  }

  const refreshedBody = text.text.replace(/```html\n?|```\n?/g, '').trim()

  // Update content record
  await prisma.content.update({
    where: { id: content.contentId },
    data: {
      body: refreshedBody,
      wordCount: countWordsInHTML(refreshedBody),
      status: 'pending_approval',
    },
  })

  await prisma.monitoringLog.create({
    data: {
      siteId: content.siteId,
      runType: 'content_refresh',
      model: 'claude-opus',
      status: 'success',
      summary: {
        contentId: content.contentId,
        keyword: content.targetKeyword,
        rankDrop: content.rankDrop,
        daysSincePublish: content.daysSincePublish,
      } as never,
    },
  })

  return { refreshedBody }
}
