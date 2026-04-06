import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const siteId = searchParams.get('state')

  if (!code || !siteId) {
    return NextResponse.redirect(`${process.env.APP_URL}/settings?gsc=error`)
  }

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )
    const { tokens } = await auth.getToken(code)
    auth.setCredentials(tokens)

    const sc = google.searchconsole({ version: 'v1', auth })
    const sites = await sc.sites.list()
    const firstSite = sites.data.siteEntry?.[0]?.siteUrl ?? ''

    await prisma.site.update({
      where: { id: siteId },
      data: {
        gscCredentials: tokens as never,
        gscPropertyUrl: firstSite,
      },
    })

    return NextResponse.redirect(`${process.env.APP_URL}/settings?gsc=connected`)
  } catch {
    return NextResponse.redirect(`${process.env.APP_URL}/settings?gsc=error`)
  }
}
