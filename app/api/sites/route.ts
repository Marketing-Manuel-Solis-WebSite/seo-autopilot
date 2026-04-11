import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'
import { checkLimit } from '@/lib/stripe/subscription'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const sites = await prisma.site.findMany({
    where: { isActive: true },
    include: {
      audits: { orderBy: { createdAt: 'desc' }, take: 1 },
      alerts: { where: { isRead: false }, orderBy: { createdAt: 'desc' }, take: 5 },
      _count: {
        select: {
          keywords: true,
          content: true,
          fixes: { where: { status: 'pending_approval' } },
          backlinks: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(sites)
}

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { allowed, current, limit, plan } = await checkLimit('sites')
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Limite de sitios alcanzado',
        message: `Tu plan ${plan} permite ${limit} sitio(s). Actualmente tienes ${current}. Actualiza tu plan en /billing.`,
      },
      { status: 403 },
    )
  }

  const body = await request.json()

  const site = await prisma.site.create({
    data: {
      name: body.name,
      domain: body.domain,
      url: body.url,
      cmsType: body.cmsType,
      cmsApiUrl: body.cmsApiUrl,
      cmsApiKey: body.cmsApiKey,
      targetCountry: body.targetCountry ?? 'us',
      targetLanguage: body.targetLanguage ?? 'en',
    },
  })

  return NextResponse.json(site, { status: 201 })
}
