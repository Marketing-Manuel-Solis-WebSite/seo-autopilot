import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { claudeOpusGenerateContent } from '@/lib/claude/opus'
import { analyzeSERP } from '@/lib/serp/analyzer'
import { buildTopicMap } from '@/lib/seo/topical-authority'
import { generateInternalLinkingPlan } from '@/lib/seo/topical-authority'
import { countWordsInHTML } from '@/lib/utils/helpers'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId, contentType, targetKeyword, wordCount, additionalContext } = await request.json()

  if (!siteId || !targetKeyword) {
    return NextResponse.json(
      { error: 'siteId and targetKeyword are required' },
      { status: 400 },
    )
  }

  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  // Check for duplicate keyword
  const existingContent = await prisma.content.findFirst({
    where: {
      siteId,
      targetKeyword,
      status: { in: ['published', 'pending_approval', 'approved'] },
    },
  })

  if (existingContent) {
    return NextResponse.json(
      { error: `Ya existe contenido para la keyword "${targetKeyword}": "${existingContent.title}"` },
      { status: 409 },
    )
  }

  const recentContent = await prisma.content.findMany({
    where: { siteId, status: 'published' },
    select: { title: true, targetKeyword: true },
    take: 10,
    orderBy: { publishedAt: 'desc' },
  })

  // Fetch SERP analysis for competitive context
  let serpAnalysis
  try {
    serpAnalysis = await analyzeSERP(targetKeyword, site.targetCountry ?? 'us')
  } catch {
    // Continue without SERP data — content generation still works
  }

  // Fetch topical authority context
  let topicMapContext
  try {
    const topicMap = await buildTopicMap(siteId)
    if (topicMap.clusters.length > 0 || topicMap.pillarOpportunities.length > 0) {
      topicMapContext = {
        pillarOpportunities: topicMap.pillarOpportunities,
        clusters: topicMap.clusters,
      }
    }
  } catch {
    // Continue without topical data
  }

  const generated = await claudeOpusGenerateContent({
    siteContext: { domain: site.domain, name: site.name, recentContent },
    contentBrief: { type: contentType, additionalContext },
    targetKeyword,
    contentType,
    wordCount: wordCount ?? 1500,
    serpAnalysis,
    topicMapContext,
  })

  // Validate meta lengths
  const metaTitle = generated.metaTitle.length > 60
    ? generated.metaTitle.slice(0, 57) + '...'
    : generated.metaTitle

  const metaDescription = generated.metaDescription.length > 160
    ? generated.metaDescription.slice(0, 157) + '...'
    : generated.metaDescription

  // Ensure unique slug
  let slug = generated.slug
  const existingSlug = await prisma.content.findFirst({
    where: { siteId, slug },
  })
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  // Accurate word count from HTML
  const actualWordCount = countWordsInHTML(generated.body)

  const content = await prisma.content.create({
    data: {
      siteId,
      contentType,
      title: generated.title,
      slug,
      targetKeyword,
      body: generated.body,
      metaTitle,
      metaDescription,
      schema: generated.schema as never,
      seoScore: generated.seoScore,
      wordCount: actualWordCount,
      status: 'pending_approval',
      generatedBy: 'claude-opus',
    },
  })

  // Generate internal linking plan in background
  generateInternalLinkingPlan(siteId, content.id).catch(err => {
    console.error('[Content Gen] Internal linking plan failed:', err)
  })

  return NextResponse.json({
    ...generated,
    metaTitle,
    metaDescription,
    slug,
    wordCount: actualWordCount,
    contentId: content.id,
  })
}
