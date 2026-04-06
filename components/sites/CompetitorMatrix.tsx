import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatNumber } from '@/lib/utils/helpers'

interface Competitor {
  id: string
  domain: string
  visibilityScore: number | null
  commonKeywords: number | null
  aboveUs: number | null
  belowUs: number | null
}

interface CompetitorMatrixProps {
  competitors: Competitor[]
}

export default function CompetitorMatrix({ competitors }: CompetitorMatrixProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Competidor</TableHead>
          <TableHead className="text-right">Visibilidad</TableHead>
          <TableHead className="text-right">Keywords comunes</TableHead>
          <TableHead className="text-right">Nos superan</TableHead>
          <TableHead className="text-right">Los superamos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {competitors.map(comp => (
          <TableRow key={comp.id}>
            <TableCell className="font-medium">{comp.domain}</TableCell>
            <TableCell className="text-right font-mono">
              {comp.visibilityScore?.toFixed(1) ?? '—'}
            </TableCell>
            <TableCell className="text-right font-mono">
              {comp.commonKeywords ? formatNumber(comp.commonKeywords) : '—'}
            </TableCell>
            <TableCell className="text-right font-mono text-red-500">
              {comp.aboveUs ?? '—'}
            </TableCell>
            <TableCell className="text-right font-mono text-green-500">
              {comp.belowUs ?? '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
