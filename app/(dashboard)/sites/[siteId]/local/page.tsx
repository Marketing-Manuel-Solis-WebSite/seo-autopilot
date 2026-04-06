import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { generateLocationSchema, type LocationData } from '@/lib/seo/local-seo'

export default async function LocalSEOPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, name: true, domain: true },
  })
  if (!site) notFound()

  const locations = await prisma.location.findMany({
    where: { siteId, isActive: true },
    include: {
      localRankings: { orderBy: { checkedAt: 'desc' }, take: 5 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Local SEO — ${site.name}`}
        description="Ubicaciones, rankings locales y schema LocalBusiness"
      />

      {locations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay ubicaciones configuradas. Agrega una desde Configuración.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locations.map(location => {
            const schema = generateLocationSchema(location)
            const hasSchema = !!schema

            return (
              <Card key={location.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{location.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">{location.businessType}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p>{location.address}</p>
                    <p>{location.city}, {location.state} {location.zip}</p>
                    <p>{location.phone}</p>
                    {location.email && <p>{location.email}</p>}
                  </div>

                  <div className="flex gap-2">
                    <Badge className={hasSchema ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}>
                      Schema: {hasSchema ? 'Generated' : 'Missing'}
                    </Badge>
                    <Badge className={location.gbpPlaceId ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}>
                      GBP: {location.gbpPlaceId ? 'Connected' : 'Not connected'}
                    </Badge>
                  </div>

                  {location.localRankings.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">Rankings locales recientes</p>
                      <div className="space-y-1">
                        {location.localRankings.map(r => (
                          <div key={r.id} className="flex items-center justify-between text-xs">
                            <span className="truncate">{r.keyword}</span>
                            <div className="flex gap-2">
                              <span className="font-mono">#{r.position}</span>
                              {r.mapPosition && (
                                <span className="font-mono text-muted-foreground">Maps: #{r.mapPosition}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
