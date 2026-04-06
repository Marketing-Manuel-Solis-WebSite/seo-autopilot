import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { rankChangeIndicator, formatNumber } from '@/lib/utils/helpers'

interface Keyword {
  id: string
  keyword: string
  searchVolume: number | null
  difficulty: number | null
  intent: string | null
  rankings: Array<{ position: number; change: number | null }>
}

interface KeywordTableProps {
  keywords: Keyword[]
}

export default function KeywordTable({ keywords }: KeywordTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Keyword</TableHead>
          <TableHead className="text-right">Posición</TableHead>
          <TableHead className="text-right">Cambio</TableHead>
          <TableHead className="text-right">Volumen</TableHead>
          <TableHead className="text-right">Dificultad</TableHead>
          <TableHead>Intent</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keywords.map(kw => {
          const ranking = kw.rankings[0]
          const change = ranking?.change ?? 0
          const indicator = rankChangeIndicator(change)

          return (
            <TableRow key={kw.id}>
              <TableCell className="font-medium">{kw.keyword}</TableCell>
              <TableCell className="text-right font-mono">
                {ranking?.position ?? '—'}
              </TableCell>
              <TableCell className={`text-right font-mono ${indicator.className}`}>
                {ranking ? indicator.label : '—'}
              </TableCell>
              <TableCell className="text-right font-mono">
                {kw.searchVolume ? formatNumber(kw.searchVolume) : '—'}
              </TableCell>
              <TableCell className="text-right font-mono">
                {kw.difficulty !== null ? `${kw.difficulty}%` : '—'}
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
