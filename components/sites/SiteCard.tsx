import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, ExternalLink, PauseCircle } from 'lucide-react'

interface SiteCardProps {
  id: string
  name: string
  domain: string
  url: string
  cmsType?: string | null
  score?: number | null
  alertCount?: number
  keywordCount?: number
  /** Search Console linked through OAuth */
  gscConnected?: boolean
  /** Source repository linked (read-only) */
  repo?: string | null
  /** Results data loaded into the app */
  hasResults?: boolean
  isActive?: boolean
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : Circle
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <Icon className="h-3.5 w-3.5" style={{ color: ok ? '#0ca30c' : 'var(--muted-foreground)' }} aria-hidden />
      <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </span>
  )
}

export default function SiteCard({
  id,
  name,
  domain,
  cmsType,
  score,
  alertCount = 0,
  keywordCount = 0,
  gscConnected,
  repo,
  hasResults,
  isActive = true,
}: SiteCardProps) {
  const connected = Boolean(repo || gscConnected || hasResults)
  return (
    <Link href={`/sites/${id}`}>
      <Card className="h-full transition-all hover:border-primary/50 hover:shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="text-base">{name}</CardTitle>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{domain}</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </div>
          {connected ? (
            <Badge className="bg-green-500/10 text-green-500">Conectado</Badge>
          ) : score !== null && score !== undefined ? (
            <span className={`text-2xl font-bold font-mono ${score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
              {score}
            </span>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {(repo !== undefined || gscConnected !== undefined || hasResults !== undefined) && (
            <div className="space-y-1.5">
              <Status ok={Boolean(repo)} label={repo ? `Repositorio del sitio · ${repo.split('/')[1]}` : 'Repositorio sin conectar'} />
              <Status ok={Boolean(hasResults)} label={hasResults ? 'Search Console y GA4 · datos cargados' : 'Sin datos de resultados'} />
              <Status ok={Boolean(gscConnected)} label={gscConnected ? 'Search Console en vivo' : 'Search Console en vivo: falta autorizar'} />
              {!isActive && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PauseCircle className="h-3.5 w-3.5" aria-hidden /> Monitoreo automático en pausa
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            {cmsType && <Badge variant="outline" className="text-xs">{cmsType}</Badge>}
            {alertCount > 0 && <Badge variant="destructive" className="text-xs">{alertCount} alertas</Badge>}
            <Badge variant="secondary" className="text-xs">{keywordCount} keywords</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
