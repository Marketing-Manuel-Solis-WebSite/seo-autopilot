import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const siteId = searchParams.get('state')
  const appUrl = process.env.APP_URL ?? ''

  if (!code || !siteId) {
    console.error('[GSC Callback] Missing params — code:', !!code, 'siteId:', siteId)
    return NextResponse.redirect(`${appUrl}/settings?gsc=error`)
  }

  try {
    // Verify the site exists and get its domain for matching
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { domain: true },
    })
    if (!site) {
      console.error('[GSC Callback] Site not found:', siteId)
      return NextResponse.redirect(`${appUrl}/settings?gsc=error`)
    }

    // Exchange authorization code for tokens
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )

    const { tokens } = await auth.getToken(code)
    console.log('[GSC Callback] Token exchange OK, scopes:', tokens.scope)
    auth.setCredentials(tokens)

    // Fetch the list of GSC properties this account has access to
    const sc = google.searchconsole({ version: 'v1', auth })
    const sitesResponse = await sc.sites.list()
    const siteEntries = sitesResponse.data.siteEntry ?? []
    console.log('[GSC Callback] GSC properties found:', siteEntries.map(s => s.siteUrl))

    // Try to match the site's domain to a GSC property
    const domain = site.domain.replace(/^www\./, '')
    const matchedProperty =
      siteEntries.find(s => s.siteUrl === `sc-domain:${domain}`) ??
      siteEntries.find(s => s.siteUrl === `https://${domain}/`) ??
      siteEntries.find(s => s.siteUrl === `https://www.${domain}/`) ??
      siteEntries.find(s => s.siteUrl === `http://${domain}/`) ??
      siteEntries[0]

    const propertyUrl = matchedProperty?.siteUrl ?? ''
    console.log('[GSC Callback] Matched property:', propertyUrl, 'for domain:', domain)

    // Serialize tokens as a plain object for the Json field
    const credentials = {
      access_token: tokens.access_token ?? null,
      refresh_token: tokens.refresh_token ?? null,
      token_type: tokens.token_type ?? null,
      expiry_date: tokens.expiry_date ?? null,
      scope: tokens.scope ?? null,
    }

    await prisma.site.update({
      where: { id: siteId },
      data: {
        gscCredentials: credentials,
        gscPropertyUrl: propertyUrl,
      },
    })
    console.log('[GSC Callback] Saved credentials for site:', siteId)

    return NextResponse.redirect(`${appUrl}/settings?gsc=connected`)
  } catch (error) {
    console.error('[GSC Callback] FAILED for site:', siteId, error)
    return NextResponse.redirect(`${appUrl}/settings?gsc=error`)
  }
}
