import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'

interface Backlink {
  id: string
  sourceUrl: string
  targetUrl: string
  anchorText: string | null
  domainAuthority: number | null
  isDoFollow: boolean
}

interface BacklinkTableProps {
  backlinks: Backlink[]
}

export default function BacklinkTable({ backlinks }: BacklinkTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          <TableHead>Anchor</TableHead>
          <TableHead>Target</TableHead>
          <TableHead className="text-right">DA</TableHead>
          <TableHead>Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {backlinks.map(bl => (
          <TableRow key={bl.id}>
            <TableCell className="max-w-48 truncate">
              <a href={bl.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-500 hover:underline">
                {(() => { try { return new URL(bl.sourceUrl).hostname } catch { return bl.sourceUrl } })()}
                <ExternalLink className="h-3 w-3" />
              </a>
            </TableCell>
            <TableCell className="max-w-32 truncate">{bl.anchorText ?? '—'}</TableCell>
            <TableCell className="max-w-32 truncate text-muted-foreground">{bl.targetUrl}</TableCell>
            <TableCell className="text-right font-mono">
              {bl.domainAuthority ?? '—'}
            </TableCell>
            <TableCell>
              <Badge variant={bl.isDoFollow ? 'default' : 'secondary'} className="text-xs">
                {bl.isDoFollow ? 'DoFollow' : 'NoFollow'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
