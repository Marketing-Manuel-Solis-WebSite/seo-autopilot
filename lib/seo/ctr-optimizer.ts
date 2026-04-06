import { prisma } from '@/lib/prisma'
import { getAnthropic, MODELS } from '@/lib/claude/client'
import { withRetry } from '@/lib/utils/retry'
import { getCMSAdapter } from '@/lib/cms'

export async function generateMetaVariants(
  content: { id: string; siteId: string; title: string; metaTitle: string | null; targetKeyword: string; publishedUrl: string | null },
  currentCTR: number,
) {
  const currentMeta = content.metaTitle ?? content.title

  const response = await withRetry(
    () => getAnthropic().messages.create({
      model: MODELS.SONNET,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Generate ONE alternative meta title for SEO A/B testing.

Current meta title: "${currentMeta}"
Target keyword: "${content.targetKeyword}"
Current CTR: ${(currentCTR * 100).toFixed(1)}%

Rules:
- Must contain the keyword "${content.targetKeyword}" naturally
- Max 60 characters
- Must be significantly different from the current title
- Use one of these approaches: number-led, question format, power word, or year inclusion (2026)
- Goal: increase click-through rate

Respond with ONLY the new meta title text, nothing else.`,
      }],
    }),
    { maxAttempts: 3, baseDelayMs: 1000, label: 'Claude Sonnet meta variant' },
  )

  const text = response.content.find(b => b.type === 'text')
  if (!text || text.type !== 'text') return null

  const variantB = text.text.trim().replace(/^["']|["']$/g, '')

  return prisma.metaVariant.create({
    data: {
      siteId: content.siteId,
      contentId: content.id,
      url: content.publishedUrl ?? '',
      keyword: content.targetKeyword,
      variantA: currentMeta,
      variantB,
      status: 'testing',
    },
  })
}

export async function analyzeVariantPerformance(variant: {
  id: string
  siteId: string
  variantA: string
  variantB: string
  impressionsA: number
  clicksA: number
  impressionsB: number
  clicksB: number
  startedAt: Date
  url: string
}) {
  const daysSinceStart = Math.floor((Date.now() - variant.startedAt.getTime()) / (24 * 60 * 60 * 1000))
  if (daysSinceStart < 14) return null // Not enough time

  const totalImpressions = variant.impressionsA + variant.impressionsB
  if (totalImpressions < 100) return null // Not enough data

  const ctrA = variant.impressionsA > 0 ? variant.clicksA / variant.impressionsA : 0
  const ctrB = variant.impressionsB > 0 ? variant.clicksB / variant.impressionsB : 0

  const difference = Math.abs(ctrA - ctrB) / Math.max(ctrA, ctrB, 0.001)
  if (difference < 0.1) return null // Less than 10% difference — inconclusive

  const winner = ctrA >= ctrB ? 'A' : 'B'
  const winningTitle = winner === 'A' ? variant.variantA : variant.variantB

  await prisma.metaVariant.update({
    where: { id: variant.id },
    data: {
      winner,
      status: 'complete',
      completedAt: new Date(),
    },
  })

  // If B wins, apply via CMS adapter
  if (winner === 'B') {
    try {
      const site = await prisma.site.findUniqueOrThrow({
        where: { id: variant.siteId },
      })
      const adapter = getCMSAdapter(site)
      const slug = variant.url ? new URL(variant.url, `https://${site.domain}`).pathname.replace(/^\//, '').replace(/\/$/, '') : ''
      await adapter.applyMetaFix(site, slug, winningTitle, '')

      await prisma.metaVariant.update({
        where: { id: variant.id },
        data: { status: 'applied' },
      })
    } catch (err) {
      console.error(`Failed to apply winning meta variant ${variant.id}:`, err)
    }
  }

  return { winner, ctrA, ctrB }
}
