import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { getCMSAdapter } from '@/lib/cms'
import { AUTO_APPLICABLE } from '@/lib/monitoring/rank-protector'
import { triggerAlert } from '@/lib/monitoring/alert-engine'

// Fix types that modify meta tags via CMS API
const META_FIX_TYPES = ['fix_meta_title', 'fix_meta_description'] as const

// Fix types that modify post content/HTML via CMS API
const CONTENT_FIX_TYPES = ['add_schema_markup', 'fix_heading_structure', 'add_alt_text', 'fix_broken_link'] as const

// Fix types that are advisory — Claude gives recommendations, human/manual action needed
const ADVISORY_FIX_TYPES = ['ranking_recovery', 'snippet_optimization', 'compress_images', 'fix_noindex_error'] as const

function extractSlug(affectedUrl: string, domain: string): string {
  return new URL(affectedUrl, `https://${domain}`).pathname
    .replace(/^\//, '')
    .replace(/\/$/, '')
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  let fixId: string
  try {
    const body = await request.json()
    fixId = body.fixId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!fixId) {
    return NextResponse.json({ error: 'fixId is required' }, { status: 400 })
  }

  const fix = await prisma.fix.findUnique({
    where: { id: fixId },
    include: { site: true },
  })

  if (!fix) {
    return NextResponse.json({ error: 'Fix not found' }, { status: 404 })
  }

  const isAutoApplicable = (AUTO_APPLICABLE as readonly string[]).includes(fix.fixType)

  // Auto-applicable fixes can skip approval; destructive fixes require approval
  if (!isAutoApplicable && fix.status !== 'approved') {
    return NextResponse.json(
      { error: 'Fix must be approved before applying' },
      { status: 400 },
    )
  }

  // Store rollback data before applying
  if (!fix.rollbackData) {
    await prisma.fix.update({
      where: { id: fixId },
      data: {
        rollbackData: {
          previousValue: fix.beforeValue,
          timestamp: new Date().toISOString(),
          appliedBy: user.id,
        } as never,
      },
    })
  }

  try {
    await prisma.fix.update({
      where: { id: fixId },
      data: { status: 'applying' },
    })

    const site = fix.site
    const adapter = getCMSAdapter(site)
    let result: { success: boolean; url?: string; error?: string }

    // ── META FIXES: update meta title/description via CMS ──
    if ((META_FIX_TYPES as readonly string[]).includes(fix.fixType)) {
      if (!fix.affectedUrl) {
        return NextResponse.json(
          { error: 'Cannot apply meta fix: no affected URL specified' },
          { status: 400 },
        )
      }

      const slug = extractSlug(fix.affectedUrl, site.domain)
      if (!slug) {
        return NextResponse.json(
          { error: 'Cannot apply meta fix: empty slug derived from URL' },
          { status: 400 },
        )
      }

      // Only update the specific field being fixed
      const metaTitle = fix.fixType === 'fix_meta_title' ? (fix.afterValue ?? '') : ''
      const metaDescription = fix.fixType === 'fix_meta_description' ? (fix.afterValue ?? '') : ''

      result = await adapter.applyMetaFix(site, slug, metaTitle, metaDescription)

    // ── CONTENT FIXES: update post body/HTML via CMS ──
    } else if ((CONTENT_FIX_TYPES as readonly string[]).includes(fix.fixType)) {
      if (!fix.affectedUrl || !fix.afterValue) {
        // No concrete value to apply → mark as advisory/manual action
        result = { success: true, url: fix.affectedUrl ?? undefined }
      } else {
        const slug = extractSlug(fix.affectedUrl, site.domain)
        if (slug) {
          // Use updatePost for content/HTML changes (schema, headings, alt text, broken links)
          result = await adapter.updatePost(site, slug, {
            body: fix.afterValue,
          })
        } else {
          result = { success: true, url: fix.affectedUrl }
        }
      }

    // ── ADVISORY FIXES: recommendations from AI, no CMS action needed ──
    } else {
      // ranking_recovery, snippet_optimization, compress_images, fix_noindex_error, etc.
      // These are AI-generated recommendations that the user reviewed and approved.
      // Mark as applied — the actual implementation is manual or via other tools.
      result = { success: true, url: fix.affectedUrl ?? undefined }
    }

    if (result.success) {
      await prisma.fix.update({
        where: { id: fixId },
        data: {
          status: 'applied',
          appliedAt: new Date(),
          approvedBy: fix.approvedBy ?? user.id,
          approvedAt: fix.approvedAt ?? new Date(),
        },
      })

      return NextResponse.json({ status: 'applied', fixId, url: result.url })
    }

    await prisma.fix.update({
      where: { id: fixId },
      data: { status: 'failed' },
    })

    await triggerAlert({
      siteId: site.id,
      alertType: 'fix_failed',
      severity: 'warning',
      title: `Fix failed: ${fix.title}`,
      message: result.error ?? 'Unknown error applying fix',
    })

    return NextResponse.json(
      { error: 'Failed to apply fix', detail: result.error },
      { status: 502 },
    )
  } catch (error) {
    await prisma.fix.update({
      where: { id: fixId },
      data: { status: 'failed' },
    })
    return NextResponse.json(
      { error: 'Failed to apply fix', detail: (error as Error).message },
      { status: 500 },
    )
  }
}
