import { prisma } from '@/lib/prisma'
import SiteCard from '@/components/sites/SiteCard'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { isGSCConfigured } from '@/lib/gsc/client'
import { repoForDomain } from '@/lib/sites/connections'

export const dynamic = 'force-dynamic'

export default async function SitesPage() {
  // All sites, including those with automatic monitoring paused
  const sites = await prisma.site.findMany({
    include: {
      audits: { orderBy: { createdAt: 'desc' }, take: 1 },
      alerts: { where: { isRead: false } },
      _count: { select: { keywords: true, reports: true } },
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  })
  const active = sites.filter(s => s.isActive).length

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Sitios"
        description={`${sites.length} sitio${sites.length === 1 ? '' : 's'} · ${active} con monitoreo automático`}
      >
        <Link href="/settings">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Agregar sitio</Button>
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map(site => (
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
            isActive={site.isActive}
          />
        ))}
      </div>
    </div>
  )
}
