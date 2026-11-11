import { prisma } from '@/lib/prisma'
import SiteCard from '@/components/sites/SiteCard'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { isGSCConfigured } from '@/lib/gsc/client'
import { getLiveWatch, repoForDomain } from '@/lib/sites/connections'

export const dynamic = 'force-dynamic'

export default async function SitesPage() {
  // Every site, with its connections and latest live check
  const sites = await prisma.site.findMany({
    include: {
      audits: { orderBy: { createdAt: 'desc' }, take: 1 },
      alerts: { where: { isRead: false } },
      _count: { select: { keywords: true, reports: true } },
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  })
  const live = await Promise.all(sites.map(s => getLiveWatch(s.id)))
  const liveCount = live.filter(Boolean).length

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Sitios"
        description={`${sites.length} sitio${sites.length === 1 ? '' : 's'} · ${liveCount} en monitoreo en vivo`}
      >
        <Link href="/settings">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Agregar sitio</Button>
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site, i) => (
          <SiteCard
            key={site.id}
            id={site.id}
            name={site.name}
            domain={site.domain}
            url={site.url}
            cmsType={site.cmsType}
            score={site.audits[0]?.score}
            alertCount={site.alerts.length}
            keywordCount={site._count.keywords}
            gscConnected={isGSCConfigured(site)}
            repo={repoForDomain(site.domain)}
            hasResults={site._count.reports > 0}
            live={live[i]}
          />
        ))}
      </div>
    </div>
  )
}
