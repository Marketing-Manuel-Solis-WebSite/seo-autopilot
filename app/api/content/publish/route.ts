import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { getCMSAdapter } from '@/lib/cms'
import { triggerAlert } from '@/lib/monitoring/alert-engine'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { contentId } = await request.json()

  const content = await prisma.content.findUniqueOrThrow({
    where: { id: contentId },
    include: { site: true },
  })

  if (content.status !== 'approved' && content.status !== 'publish_failed') {
    return NextResponse.json(
      { error: 'Content must be approved or in publish_failed state' },
      { status: 400 },
    )
  }

  const site = content.site
  const adapter = getCMSAdapter(site)

  // Apply internal links to the body before publishing
  const internalLinks = await prisma.internalLink.findMany({
    where: { fromContentId: contentId, status: 'pending' },
    include: { toContent: { select: { publishedUrl: true, title: true } } },
  })

  let bodyWithLinks = content.body
  for (const link of internalLinks) {
    if (link.toContent.publishedUrl) {
      const linkHtml = `<a href="${link.toContent.publishedUrl}">${link.anchorText}</a>`
      // Insert link near first occurrence of the anchor text in the body
      bodyWithLinks = bodyWithLinks.replace(
        new RegExp(`(?<!<a[^>]*>)${escapeRegex(link.anchorText)}(?!</a>)`, 'i'),
        linkHtml,
      )
      await prisma.internalLink.update({
        where: { id: link.id },
        data: { status: 'applied' },
      })
    }
  }

  const result = await adapter.publishPost(site, {
    title: content.title,
    body: bodyWithLinks,
    slug: content.slug,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    schema: content.schema,
  })

  if (result.success) {
    await prisma.content.update({
      where: { id: contentId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedUrl: result.url ?? `https://${site.domain}/${content.slug}`,
      },
    })

    return NextResponse.json({
      status: 'published',
      contentId,
      postId: result.postId,
      url: result.url,
    })
  }

  // Publish failed
  await prisma.content.update({
    where: { id: contentId },
    data: { status: 'publish_failed' },
  })

  await triggerAlert({
    siteId: site.id,
    alertType: 'publish_failed',
    severity: 'warning',
    title: `Failed to publish: ${content.title}`,
    message: result.error ?? 'Unknown CMS error',
  })

  return NextResponse.json(
    { error: 'CMS publish failed', detail: result.error },
    { status: 502 },
  )
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
