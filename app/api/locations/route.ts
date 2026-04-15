import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/supabase/route-auth'

export async function GET(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get('siteId')

  const locations = await prisma.location.findMany({
    where: siteId ? { siteId, isActive: true } : { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      localRankings: { orderBy: { checkedAt: 'desc' }, take: 5 },
    },
  })

  return NextResponse.json(locations)
}

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()

    if (!body.siteId || !body.name || !body.address || !body.city || !body.state || !body.zip || !body.phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const location = await prisma.location.create({
      data: {
        siteId: body.siteId,
        name: body.name,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        phone: body.phone,
        email: body.email,
        businessType: body.businessType ?? 'LocalBusiness',
        gbpPlaceId: body.gbpPlaceId,
      },
    })

    return NextResponse.json(location, { status: 201 })
  } catch (err) {
    console.error('[Locations POST]', err)
    return NextResponse.json({ error: 'Error creating location' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('id')
  if (!locationId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  await prisma.location.update({
    where: { id: locationId },
    data: { isActive: false },
  })

  return NextResponse.json({ status: 'deactivated' })
}
