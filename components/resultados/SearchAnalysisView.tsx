import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SearchAnalysisData } from '@/lib/resultados/types'
import MetricTable from '@/components/resultados/MetricTable'
import { fmt, pctChange, StatTile } from '@/components/resultados/Stats'

const COUNTRIES: Record<string, string> = {
  usa: 'Estados Unidos', mex: 'México', slv: 'El Salvador', col: 'Colombia', gtm: 'Guatemala', hnd: 'Honduras',
  ven: 'Venezuela', esp: 'España', can: 'Canadá', per: 'Perú', dom: 'República Dominicana', arg: 'Argentina',
  ecu: 'Ecuador', nic: 'Nicaragua', chl: 'Chile', cub: 'Cuba', bra: 'Brasil', ind: 'India', phl: 'Filipinas', gbr: 'Reino Unido',
}
const DEVICES: Record<string, string> = { MOBILE: 'Móvil', DESKTOP: 'Escritorio', TABLET: 'Tableta', mobile: 'Móvil', desktop: 'Escritorio', tablet: 'Tableta', 'smart tv': 'Smart TV' }

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

const shortUrl = (u: string) => u.replace('https://www.manuelsolis.com', '').replace('https://manuelsolis.com', '') || '/'

export default function SearchAnalysisView({ data, site }: { data: SearchAnalysisData; site: string }) {
  const t = data.totals
  return (
    <div className="space-y-6 p-6">
      <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground">← Reportes</Link>
      <PageHeader title="Análisis de búsqueda y audiencia" description={`${site} · ${data.period}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Clics desde Google · 12 meses" value={fmt(t.clicks12m)} delta={null} deltaSuffix="" />
        <StatTile label="Impresiones en Google · 12 meses" value={fmt(t.impressions12m)} delta={null} deltaSuffix="" />
        <StatTile
          label="Clics · últimos 3 meses"
          value={fmt(t.clicks3m)}
          delta={pctChange(t.clicks3m, t.clicksPrev3m)}
          deltaSuffix={`vs los 3 meses anteriores (${fmt(t.clicksPrev3m)})`}
        />
        <StatTile
          label="Impresiones · últimos 3 meses"
          value={fmt(t.impressions3m)}
          delta={pctChange(t.impressions3m, t.impressionsPrev3m)}
          deltaSuffix={`vs los 3 meses anteriores (${fmt(t.impressionsPrev3m)})`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Búsquedas con más clics · 12 meses" subtitle="Search Console, todas las búsquedas que trajeron visitas">
          <MetricTable rows={data.queries12m} columns={['clicks', 'impressions', 'ctr', 'position']} firstHeader="Búsqueda" limit={25} />
        </Section>
        <Section title="Búsquedas con más clics · últimos 3 meses" subtitle="26 jul – 25 oct 2026">
          <MetricTable rows={data.queries3m} columns={['clicks', 'impressions', 'ctr', 'position']} firstHeader="Búsqueda" limit={25} />
        </Section>
      </div>

      <Section
        title="Oportunidades: búsquedas sin marca en posiciones 4 a 15"
        subtitle="Muchas impresiones y pocos clics: subir unas posiciones o mejorar el título trae tráfico nuevo"
      >
        <MetricTable rows={data.opportunities} columns={['impressions', 'clicks', 'ctr', 'position']} firstHeader="Búsqueda" limit={25} />
      </Section>

      <Section title="Páginas con más clics · últimos 3 meses" subtitle="Search Console por página">
        <MetricTable rows={data.pages3m} columns={['clicks', 'impressions', 'ctr', 'position']} firstHeader="Página" formatKey={shortUrl} linkKeys limit={30} />
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Países · Search Console (3 meses)">
          <MetricTable rows={data.countries3m} columns={['clicks', 'impressions', 'ctr', 'position']} firstHeader="País" formatKey={k => COUNTRIES[k] ?? k.toUpperCase()} />
        </Section>
        <Section title="Dispositivos · Search Console (3 meses)">
          <MetricTable rows={data.devices3m} columns={['clicks', 'impressions', 'ctr', 'position']} firstHeader="Dispositivo" formatKey={k => DEVICES[k] ?? k} />
        </Section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Canales de tráfico · GA4 (12 meses)" subtitle="Dominios de manuelsolis.com, incluido consulta.manuelsolis.com">
          <MetricTable rows={data.channels} columns={['sessions', 'users', 'engagement']} firstHeader="Canal" />
        </Section>
        <Section title="Fuentes de tráfico · GA4 (12 meses)">
          <MetricTable rows={data.sources} columns={['sessions', 'users', 'engagement']} firstHeader="Fuente / medio" limit={15} />
        </Section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Dispositivos · GA4 (12 meses)">
          <MetricTable rows={data.gaDevices} columns={['sessions', 'users', 'engagement']} firstHeader="Dispositivo" formatKey={k => DEVICES[k] ?? k} />
        </Section>
        <Section title="Países · GA4 (12 meses)">
          <MetricTable rows={data.gaCountries} columns={['sessions', 'users', 'engagement']} firstHeader="País" />
        </Section>
      </div>

      <Section title={`Oficinas publicadas en el sitio · ${data.locations.length}`} subtitle="NAP del sitio y ficha de Google Business vinculada">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.locations.map(l => (
            <div key={l.name} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{l.name}</p>
              <p className="text-xs text-muted-foreground">{l.city}, {l.state} · {l.kind} · {l.hours}</p>
              <Badge variant="outline" className="mt-2 text-[10px]">{l.hasGbp ? 'Ficha de Google vinculada' : 'Sin ficha vinculada'}</Badge>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
