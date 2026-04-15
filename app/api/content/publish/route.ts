import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { getCMSAdapter } from '@/lib/cms'
import { triggerAlert } from '@/lib/monitoring/alert-engine'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  let contentId: string
  try {
    const body = await request.json()
    contentId = body.contentId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!contentId) {
    return NextResponse.json({ error: 'contentId is required' }, { status: 400 })
  }

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { site: true },
  })

  if (!content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  }

  if (content.status !== 'approved') {
    return NextResponse.json(
      { error: 'Content must be approved before publishing' },
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

  try {
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

    // Publish failed (adapter returned success: false)
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
  } catch (err) {
    // Adapter threw an exception
    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'publish_failed' },
    })

    await triggerAlert({
      siteId: site.id,
      alertType: 'publish_failed',
      severity: 'warning',
      title: `Failed to publish: ${content.title}`,
      message: (err as Error).message,
    })

    return NextResponse.json(
      { error: 'CMS publish failed', detail: (err as Error).message },
      { status: 500 },
    )
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
