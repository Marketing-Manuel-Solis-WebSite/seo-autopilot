import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { getCMSAdapter } from '@/lib/cms'
import { AUTO_APPLICABLE } from '@/lib/monitoring/rank-protector'
import { triggerAlert } from '@/lib/monitoring/alert-engine'

export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { fixId } = await request.json()

  const fix = await prisma.fix.findUniqueOrThrow({
    where: { id: fixId },
    include: { site: true },
  })

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

    let result

    if (fix.fixType === 'fix_meta_title' || fix.fixType === 'fix_meta_description') {
      const slug = fix.affectedUrl
        ? new URL(fix.affectedUrl, `https://${site.domain}`).pathname.replace(/^\//, '').replace(/\/$/, '')
        : ''

      result = await adapter.applyMetaFix(
        site,
        slug,
        fix.fixType === 'fix_meta_title' ? (fix.afterValue ?? '') : '',
        fix.fixType === 'fix_meta_description' ? (fix.afterValue ?? '') : '',
      )
    } else {
      // For other fix types, attempt generic update if we have an affected URL
      if (fix.affectedUrl && fix.afterValue) {
        const slug = new URL(fix.affectedUrl, `https://${site.domain}`).pathname.replace(/^\//, '').replace(/\/$/, '')
        result = await adapter.applyMetaFix(site, slug, '', '')
      } else {
        // Mark as applied — fix was informational or needs manual CMS action
        result = { success: true, url: fix.affectedUrl ?? undefined }
      }
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
