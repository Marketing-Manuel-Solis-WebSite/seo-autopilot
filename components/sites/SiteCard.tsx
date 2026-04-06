import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'

interface SiteCardProps {
  id: string
  name: string
  domain: string
  url: string
  cmsType?: string | null
  score?: number | null
  alertCount?: number
  keywordCount?: number
}

export default function SiteCard({ id, name, domain, url, cmsType, score, alertCount = 0, keywordCount = 0 }: SiteCardProps) {
  return (
    <Link href={`/sites/${id}`}>
      <Card className="transition-all hover:border-primary/50 hover:shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="text-base">{name}</CardTitle>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{domain}</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </div>
          {score !== null && score !== undefined && (
            <span className={`text-2xl font-bold font-mono ${score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
              {score}
            </span>
          )}
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          {cmsType && <Badge variant="outline" className="text-xs">{cmsType}</Badge>}
          {alertCount > 0 && <Badge variant="destructive" className="text-xs">{alertCount} alertas</Badge>}
          <Badge variant="secondary" className="text-xs">{keywordCount} keywords</Badge>
        </CardContent>
      </Card>
    </Link>
  )
}
