import { prisma } from '@/lib/prisma'
import { getAnthropic, MODELS } from '@/lib/claude/client'
import { safeParseJSON } from '@/lib/utils/helpers'

export interface TopicCluster {
  pillarTopic: string
  pillarKeyword: string
  estimatedVolume: number
  subtopics: Array<{
    title: string
    keyword: string
    covered: boolean
    contentId?: string
  }>
  coverageScore: number
  hasPillarPage: boolean
}

export interface TopicMap {
  clusters: TopicCluster[]
  orphanContent: Array<{ contentId: string; title: string; keyword: string }>
  totalCoverage: number
  pillarOpportunities: Array<{
    topic: string
    keyword: string
    existingArticles: number
    estimatedImpact: 'high' | 'medium' | 'low'
  }>
}

export async function buildTopicMap(siteId: string): Promise<TopicMap> {
  const allContent = await prisma.content.findMany({
    where: { siteId, status: { in: ['published', 'pending_approval', 'approved'] } },
    select: { id: true, title: true, targetKeyword: true, contentType: true, publishedUrl: true },
  })

  if (allContent.length === 0) {
    return { clusters: [], orphanContent: [], totalCoverage: 0, pillarOpportunities: [] }
  }

  const keywords = await prisma.keyword.findMany({
    where: { siteId, isTracking: true },
    select: { keyword: true, searchVolume: true },
    orderBy: { searchVolume: 'desc' },
    take: 100,
  })

  const response = await getAnthropic().messages.create({
    model: MODELS.SONNET,
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `Analyze this site's content and build a topical authority map.

EXISTING CONTENT:
${allContent.map(c => `- [${c.id}] "${c.title}" (keyword: ${c.targetKeyword}, type: ${c.contentType})`).join('\n')}

TRACKED KEYWORDS:
${keywords.map(k => `- "${k.keyword}" (vol: ${k.searchVolume})`).join('\n')}

Cluster the content into topical silos. For each cluster:
1. Identify the pillar topic and best pillar keyword
2. List subtopics (both covered by existing content and missing)
3. Calculate coverage score (0-100)
4. Determine if a pillar page exists
5. Identify orphan content not fitting any cluster

Also identify pillar opportunities: topics where 3+ articles exist but no pillar page.

Respond as JSON:
{
  "clusters": [{
    "pillarTopic": "string",
    "pillarKeyword": "string",
    "estimatedVolume": number,
    "subtopics": [{"title": "string", "keyword": "string", "covered": boolean, "contentId": "string or null"}],
    "coverageScore": 0-100,
    "hasPillarPage": boolean
  }],
  "orphanContent": [{"contentId": "string", "title": "string", "keyword": "string"}],
  "totalCoverage": 0-100,
  "pillarOpportunities": [{"topic": "string", "keyword": "string", "existingArticles": number, "estimatedImpact": "high"|"medium"|"low"}]
}`,
      },
    ],
  })

  const text = response.content.find(b => b.type === 'text')
  if (!text || text.type !== 'text') {
    return { clusters: [], orphanContent: [], totalCoverage: 0, pillarOpportunities: [] }
  }

  let topicMap: TopicMap
  try {
    topicMap = safeParseJSON<TopicMap>(text.text, 'Topic map analysis')
  } catch {
    return { clusters: [], orphanContent: [], totalCoverage: 0, pillarOpportunities: [] }
  }

  // Store the topic map in DB
  await prisma.topicMap.create({
    data: {
      siteId,
      data: topicMap as never,
    },
  })

  return topicMap
}

export async function identifyPillarOpportunities(siteId: string): Promise<TopicMap['pillarOpportunities']> {
  const latestMap = await prisma.topicMap.findFirst({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
  })

  if (!latestMap) {
    const map = await buildTopicMap(siteId)
    return map.pillarOpportunities
  }

  const data = latestMap.data as unknown as TopicMap
  return data.pillarOpportunities ?? []
}

export async function generateInternalLinkingPlan(
  siteId: string,
  newContentId: string,
): Promise<void> {
  const newContent = await prisma.content.findUnique({
    where: { id: newContentId },
    select: { id: true, title: true, targetKeyword: true, body: true },
  })
  if (!newContent) return

  const existingContent = await prisma.content.findMany({
    where: {
      siteId,
      id: { not: newContentId },
      status: { in: ['published', 'pending_approval', 'approved'] },
    },
    select: { id: true, title: true, targetKeyword: true, publishedUrl: true },
    take: 50,
    orderBy: { createdAt: 'desc' },
  })

  if (existingContent.length === 0) return

  const response = await getAnthropic().messages.create({
    model: MODELS.SONNET,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Generate an internal linking plan for new content.

NEW ARTICLE:
- Title: "${newContent.title}"
- Keyword: "${newContent.targetKeyword}"
- ID: ${newContent.id}

EXISTING ARTICLES:
${existingContent.map(c => `- [${c.id}] "${c.title}" (keyword: ${c.targetKeyword}, url: ${c.publishedUrl ?? 'unpublished'})`).join('\n')}

Create two sets of links:
1. FROM existing articles TO the new article (3-5 links)
2. FROM the new article TO existing articles (3-5 links)

For each link, provide specific anchor text that is natural and keyword-relevant.

Respond as JSON:
{
  "linksToNew": [{"fromContentId": "string", "anchorText": "string"}],
  "linksFromNew": [{"toContentId": "string", "anchorText": "string"}]
}`,
      },
    ],
  })

  const text = response.content.find(b => b.type === 'text')
  if (!text || text.type !== 'text') return

  let plan: {
    linksToNew: Array<{ fromContentId: string; anchorText: string }>
    linksFromNew: Array<{ toContentId: string; anchorText: string }>
  }
  try {
    plan = safeParseJSON(text.text, 'Internal linking plan')
  } catch {
    return
  }

  // Store internal links in DB
  const linksToCreate = [
    ...plan.linksToNew.map(l => ({
      siteId,
      fromContentId: l.fromContentId,
      toContentId: newContentId,
      anchorText: l.anchorText,
      status: 'pending',
    })),
    ...plan.linksFromNew.map(l => ({
      siteId,
      fromContentId: newContentId,
      toContentId: l.toContentId,
      anchorText: l.anchorText,
      status: 'pending',
    })),
  ]

  for (const link of linksToCreate) {
    // Validate that both content IDs exist
    const [from, to] = await Promise.all([
      prisma.content.findUnique({ where: { id: link.fromContentId }, select: { id: true } }),
      prisma.content.findUnique({ where: { id: link.toContentId }, select: { id: true } }),
    ])
    if (from && to) {
      await prisma.internalLink.create({ data: link })
    }
  }
}
