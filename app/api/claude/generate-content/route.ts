import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { claudeOpusGenerateContent } from '@/lib/claude/opus'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { siteId, contentType, targetKeyword, wordCount, additionalContext } = await request.json()

  const site = await prisma.site.findUniqueOrThrow({ where: { id: siteId } })

  const recentContent = await prisma.content.findMany({
    where: { siteId, status: 'published' },
    select: { title: true, targetKeyword: true },
    take: 10,
    orderBy: { publishedAt: 'desc' },
  })

  const generated = await claudeOpusGenerateContent({
    siteContext: { domain: site.domain, name: site.name, recentContent },
    contentBrief: { type: contentType, additionalContext },
    targetKeyword,
    contentType,
    wordCount: wordCount ?? 1500,
  })

  const content = await prisma.content.create({
    data: {
      siteId,
      contentType,
      title: generated.title,
      slug: generated.slug,
      targetKeyword,
      body: generated.body,
      metaTitle: generated.metaTitle,
      metaDescription: generated.metaDescription,
      schema: generated.schema as never,
      seoScore: generated.seoScore,
      wordCount: generated.body.split(/\s+/).length,
      status: 'pending_approval',
      generatedBy: 'claude-opus',
    },
  })

  return NextResponse.json({ ...generated, contentId: content.id })
}
