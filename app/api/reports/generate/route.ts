import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  let siteId: string, reportType: string, period: string
  try {
    const body = await request.json()
    siteId = body.siteId
    reportType = body.reportType
    period = body.period
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
  }

  const [audits, rankings, alerts, content, fixes] = await Promise.all([
    prisma.audit.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.ranking.findMany({
      where: { siteId },
      orderBy: { checkedAt: 'desc' },
      take: 100,
    }),
    prisma.alert.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.content.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.fix.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const report = await prisma.report.create({
    data: {
      siteId,
      reportType: reportType ?? 'weekly',
      title: `${reportType ?? 'Weekly'} Report — ${period}`,
      period,
      data: {
        audits: audits.map(a => ({ score: a.score, date: a.createdAt })),
        rankingsSummary: {
          total: rankings.length,
          improved: rankings.filter(r => (r.change ?? 0) > 0).length,
          declined: rankings.filter(r => (r.change ?? 0) < 0).length,
        },
        alertsSummary: {
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          resolved: alerts.filter(a => a.isResolved).length,
        },
        contentGenerated: content.length,
        fixesApplied: fixes.filter(f => f.status === 'applied').length,
      } as never,
    },
  })

  return NextResponse.json(report)
}
