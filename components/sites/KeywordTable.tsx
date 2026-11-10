import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { rankChangeIndicator } from '@/lib/utils/helpers'

interface Keyword {
  id: string
  keyword: string
  searchVolume: number | null
  difficulty: number | null
  intent: string | null
  gscClicks?: number | null
  gscImpressions?: number | null
  gscCtr?: number | null
  gscClicks3m?: number | null
  gscImpressions3m?: number | null
  rankings: Array<{ position: number; change: number | null }>
}

interface KeywordTableProps {
  keywords: Keyword[]
}

const nf = new Intl.NumberFormat('es-MX')
const num = (n: number | null | undefined) => (typeof n === 'number' ? nf.format(n) : '—')

export default function KeywordTable({ keywords }: KeywordTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Búsqueda en Google</TableHead>
          <TableHead className="text-right">Clics 12 m</TableHead>
          <TableHead className="text-right">Impresiones 12 m</TableHead>
          <TableHead className="text-right">CTR</TableHead>
          <TableHead className="text-right">Clics 3 m</TableHead>
          <TableHead className="text-right">Posición</TableHead>
          <TableHead className="text-right">Cambio</TableHead>
          <TableHead>Tipo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keywords.map(kw => {
          const ranking = kw.rankings[0]
          const change = ranking?.change ?? 0
          const indicator = rankChangeIndicator(change)

          return (
            <TableRow key={kw.id}>
              <TableCell className="max-w-[340px] truncate font-medium" title={kw.keyword}>{kw.keyword}</TableCell>
              <TableCell className="text-right tabular-nums">{num(kw.gscClicks)}</TableCell>
              <TableCell className="text-right tabular-nums">{num(kw.gscImpressions ?? kw.searchVolume)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {typeof kw.gscCtr === 'number' ? `${(kw.gscCtr * 100).toFixed(1)} %` : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">{num(kw.gscClicks3m)}</TableCell>
              <TableCell className="text-right tabular-nums">{ranking?.position ?? '—'}</TableCell>
              <TableCell className={`text-right tabular-nums ${indicator.className}`}>
                {ranking && ranking.change !== null ? indicator.label : '—'}
              </TableCell>
              <TableCell>
                {kw.intent && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {kw.intent}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
