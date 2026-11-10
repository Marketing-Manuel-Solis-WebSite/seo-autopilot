import type { MetricRow } from '@/lib/resultados/types'

const nf = new Intl.NumberFormat('es-MX')

export type MetricColumn = 'clicks' | 'impressions' | 'ctr' | 'position' | 'sessions' | 'users' | 'engagement'

const HEAD: Record<MetricColumn, string> = {
  clicks: 'Clics',
  impressions: 'Impresiones',
  ctr: 'CTR',
  position: 'Posición',
  sessions: 'Sesiones',
  users: 'Usuarios',
  engagement: 'Interacción',
}

function cell(col: MetricColumn, v: number | undefined) {
  if (typeof v !== 'number') return '—'
  if (col === 'ctr') return `${(v * 100).toFixed(2)} %`
  if (col === 'engagement') return `${v.toFixed(1)} %`
  if (col === 'position') return v.toFixed(1)
  return nf.format(v)
}

export default function MetricTable({
  rows,
  columns,
  firstHeader,
  formatKey,
  linkKeys,
  limit,
}: {
  rows: MetricRow[]
  columns: MetricColumn[]
  firstHeader: string
  formatKey?: (key: string) => string
  /** Render the key as a link (for page URLs) */
  linkKeys?: boolean
  limit?: number
}) {
  const shown = limit ? rows.slice(0, limit) : rows
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">{firstHeader}</th>
            {columns.map(c => (
              <th key={c} className="whitespace-nowrap py-2 pr-3 text-right font-medium last:pr-0">{HEAD[c]}</th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {shown.map((r, i) => {
            const label = formatKey ? formatKey(r.key) : r.key
            return (
              <tr key={`${r.key}-${i}`} className="border-b last:border-0">
                <td className="max-w-[420px] py-2 pr-3">
                  {linkKeys && r.key.startsWith('http') ? (
                    <a href={r.key} target="_blank" rel="noreferrer" className="break-all hover:underline">{label}</a>
                  ) : (
                    <span className="break-words">{label}</span>
                  )}
                </td>
                {columns.map(c => (
                  <td key={c} className="whitespace-nowrap py-2 pr-3 text-right last:pr-0">{cell(c, r[c])}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
