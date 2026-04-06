'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Site {
  id: string
  name: string
  domain: string
}

interface SiteSelectorProps {
  sites: Site[]
  selectedSiteId?: string
  onSelect: (siteId: string) => void
}

export default function SiteSelector({ sites, selectedSiteId, onSelect }: SiteSelectorProps) {
  return (
    <Select value={selectedSiteId} onValueChange={onSelect}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Seleccionar sitio..." />
      </SelectTrigger>
      <SelectContent>
        {sites.map(site => (
          <SelectItem key={site.id} value={site.id}>
            {site.name} ({site.domain})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
