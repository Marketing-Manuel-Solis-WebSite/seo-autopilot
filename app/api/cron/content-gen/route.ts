import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { claudeOpusGenerateContent } from '@/lib/claude/opus'
import { analyzeSERP } from '@/lib/serp/analyzer'
import { generateInternalLinkingPlan } from '@/lib/seo/topical-authority'
import { triggerAlert } from '@/lib/monitoring/alert-engine'
import { analyzeSnippetOpportunity, generateSnippetOptimizedSection } from '@/lib/seo/featured-snippets'
import { countWordsInHTML } from '@/lib/utils/helpers'
import type { TopicMap } from '@/lib/seo/topical-authority'

const MAX_DAILY_CONTENT = parseInt(process.env.MAX_DAILY_CONTENT ?? '7', 10)

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const drafts = await prisma.content.findMany({
    where: { status: 'draft', body: '' },
    include: { site: true },
    take: MAX_DAILY_CONTENT,
    orderBy: { createdAt: 'asc' },
  })

  const results = []

  for (const draft of drafts) {
    try {
      const recentContent = await prisma.content.findMany({
        where: { siteId: draft.siteId, status: 'published' },
        select: { title: true, targetKeyword: true, publishedUrl: true },
        take: 10,
        orderBy: { publishedAt: 'desc' },
      })

      // Analyze SERP before generating content
      let serpAnalysis
      try {
        serpAnalysis = await analyzeSERP(draft.targetKeyword, draft.site.targetCountry)
      } catch (err) {
        console.error(`SERP analysis failed for "${draft.targetKeyword}":`, err)
      }

      // Fetch TopicMap for topical authority context
      let topicMapContext: { pillarOpportunities: TopicMap['pillarOpportunities']; clusters: TopicMap['clusters'] } | undefined
      try {
        const latestTopicMap = await prisma.topicMap.findFirst({
          where: { siteId: draft.siteId },
          orderBy: { createdAt: 'desc' },
        })
        if (latestTopicMap) {
          const mapData = latestTopicMap.data as unknown as TopicMap
          // Find the cluster this article's keyword belongs to
          const relevantCluster = mapData.clusters?.find(c =>
            c.subtopics?.some(s => s.keyword.toLowerCase() === draft.targetKeyword.toLowerCase()) ||
            c.pillarKeyword.toLowerCase() === draft.targetKeyword.toLowerCase()
          )
          topicMapContext = {
            pillarOpportunities: mapData.pillarOpportunities ?? [],
            clusters: relevantCluster ? [relevantCluster] : [],
          }
        }
      } catch (err) {
        console.error(`TopicMap fetch failed for site ${draft.siteId}:`, err)
      }

      const minWordCount = serpAnalysis
        ? Math.max(1500, Math.round(serpAnalysis.averageWordCount * 1.3))
        : 1500

      const generated = await claudeOpusGenerateContent({
        siteContext: { domain: draft.site.domain, name: draft.site.name, recentContent },
        contentBrief: { title: draft.title, type: draft.contentType },
        targetKeyword: draft.targetKeyword,
        contentType: draft.contentType,
        wordCount: minWordCount,
        serpAnalysis,
        topicMapContext,
      })

      // Featured snippet optimization
      let finalBody = generated.body
      let snippetData: unknown = null
      try {
        const latestRanking = await prisma.ranking.findFirst({
          where: { siteId: draft.siteId, keywordText: draft.targetKeyword },
          orderBy: { checkedAt: 'desc' },
        })
        const currentPos = latestRanking?.position ?? 99
        if (currentPos <= 10) {
          const snippetOpp = await analyzeSnippetOpportunity(draft.targetKeyword, currentPos, draft.siteId)
          if (snippetOpp?.exists && snippetOpp.format !== 'none') {
            const snippetSection = await generateSnippetOptimizedSection(
              { title: generated.title, body: generated.body, targetKeyword: draft.targetKeyword },
              snippetOpp,
            )
            if (snippetSection) {
              // Insert after first heading or at top
              const h1Match = finalBody.match(/<\/h1>/i)
              if (h1Match && h1Match.index !== undefined) {
                const insertPos = h1Match.index + h1Match[0].length
                finalBody = finalBody.slice(0, insertPos) + '\n' + snippetSection + '\n' + finalBody.slice(insertPos)
              } else {
                finalBody = snippetSection + '\n' + finalBody
              }
              snippetData = snippetOpp
            }
          }
        }
      } catch (err) {
        console.error(`Snippet optimization failed for "${draft.targetKeyword}":`, err)
      }

      await prisma.content.update({
        where: { id: draft.id },
        data: {
          body: finalBody,
          metaTitle: generated.metaTitle,
          metaDescription: generated.metaDescription,
          slug: generated.slug,
          schema: {
            ...(generated.schema as Record<string, unknown>),
            ...(snippetData ? { snippetOptimization: snippetData } : {}),
          } as never,
          seoScore: generated.seoScore,
          wordCount: countWordsInHTML(finalBody),
          status: 'pending_approval',
        },
      })

      // Generate internal linking plan for this new content
      try {
        await generateInternalLinkingPlan(draft.siteId, draft.id)
      } catch (err) {
        console.error(`Internal linking plan failed for ${draft.title}:`, err)
      }

      results.push({ contentId: draft.id, title: draft.title, status: 'generated' })
    } catch (error) {
      console.error(`Content gen failed for ${draft.title}:`, error)
      results.push({ contentId: draft.id, title: draft.title, error: (error as Error).message })
    }
  }

  // Cron failure alerting for content generation
  const failed = results.filter(r => 'error' in r)
  if (failed.length > 0 && drafts.length > 0) {
    await triggerAlert({
      siteId: drafts[0].siteId,
      alertType: 'cron_failure',
      severity: failed.length === drafts.length ? 'critical' : 'warning',
      title: `content-gen: ${failed.length}/${drafts.length} drafts failed`,
      message: failed.map(f => `${f.title}: ${f.error}`).join('\n'),
    })
  }

  return NextResponse.json({ timestamp: new Date().toISOString(), generated: results.length, results })
}
