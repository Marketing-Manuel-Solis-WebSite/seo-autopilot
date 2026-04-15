import { prisma } from '@/lib/prisma'

export interface LocationData {
  id: string
  siteId: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string | null
  businessType: string
  gbpPlaceId: string | null
  isActive: boolean
}

export function generateLocationSchema(location: LocationData): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': location.businessType || 'LocalBusiness',
    name: location.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: location.address,
      addressLocality: location.city,
      addressRegion: location.state,
      postalCode: location.zip,
    },
    telephone: location.phone,
    ...(location.email && { email: location.email }),
    ...(location.gbpPlaceId && {
      additionalProperty: {
        '@type': 'PropertyValue',
        propertyID: 'GooglePlaceID',
        value: location.gbpPlaceId,
      },
    }),
  }

  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
}

export async function auditNAPConsistency(
  siteId: string,
  locations: LocationData[],
): Promise<Array<{ locationId: string; locationName: string; issue: string; field: string }>> {
  const inconsistencies: Array<{ locationId: string; locationName: string; issue: string; field: string }> = []

  // Get all published content for this site to scan for address mentions
  const allContent = await prisma.content.findMany({
    where: { siteId, status: 'published' },
    select: { id: true, title: true, body: true },
  })

  const bodyTexts = allContent.map(c => c.body.toLowerCase())

  for (const location of locations) {
    const phone = location.phone.replace(/[\s\-().+]/g, '')
    const phoneFormats = [location.phone, phone]
    // Add formatted variants only for 10-digit US numbers
    if (/^\d{10}$/.test(phone)) {
      phoneFormats.push(
        phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'),
        phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
      )
    } else if (/^1\d{10}$/.test(phone)) {
      const local = phone.slice(1)
      phoneFormats.push(
        local,
        local.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'),
        local.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
      )
    }

    // Check if phone appears consistently
    const phoneFound = bodyTexts.some(text =>
      phoneFormats.some(fmt => text.includes(fmt.toLowerCase()))
    )
    if (!phoneFound && allContent.length > 0) {
      inconsistencies.push({
        locationId: location.id,
        locationName: location.name,
        issue: `Phone number "${location.phone}" not found in any published content`,
        field: 'phone',
      })
    }

    // Check address consistency
    const addressParts = [location.address.toLowerCase(), location.city.toLowerCase()]
    const addressFound = bodyTexts.some(text =>
      addressParts.every(part => text.includes(part))
    )
    if (!addressFound && allContent.length > 0) {
      inconsistencies.push({
        locationId: location.id,
        locationName: location.name,
        issue: `Address "${location.address}, ${location.city}" not found consistently in published content`,
        field: 'address',
      })
    }

    // Check business name consistency
    const nameFound = bodyTexts.some(text =>
      text.includes(location.name.toLowerCase())
    )
    if (!nameFound && allContent.length > 0) {
      inconsistencies.push({
        locationId: location.id,
        locationName: location.name,
        issue: `Business name "${location.name}" not found in any published content`,
        field: 'name',
      })
    }
  }

  return inconsistencies
}

export function generateLocalContentBrief(
  location: LocationData,
  keyword: string,
): {
  title: string
  keyword: string
  contentType: string
  localContext: string
} {
  return {
    title: `${keyword} in ${location.city}, ${location.state}`,
    keyword: `${keyword} ${location.city} ${location.state}`,
    contentType: 'location_page',
    localContext: `Business: ${location.name}
Address: ${location.address}, ${location.city}, ${location.state} ${location.zip}
Phone: ${location.phone}
Business Type: ${location.businessType}
${location.gbpPlaceId ? `Google Business Profile: Connected` : 'Google Business Profile: Not connected'}

This is a location-specific page targeting "${keyword}" for the ${location.city}, ${location.state} area.
Include local landmarks, neighborhoods, and service area information.
Reference the physical location and contact details naturally in the content.`,
  }
}
