import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const nf = new Intl.NumberFormat('es-MX')
export const fmt = (n: number) => nf.format(n)

export function pctChange(current: number | null | undefined, base: number | null | undefined): number | null {
  if (typeof current !== 'number' || typeof base !== 'number' || !base) return null
  return ((current - base) / base) * 100
}

/**
 * Signed change with direction icon. `lowerIsBetter` flips the good/bad color
 * (e.g. average position, where going down is an improvement).
 */
export function Delta({
  value,
  suffix,
  lowerIsBetter = false,
  absolute,
}: {
  value: number | null
  suffix: string
  lowerIsBetter?: boolean
  /** Show an absolute difference (e.g. "−1.6") instead of a percentage */
  absolute?: number
}) {
  if (value === null) return null
  const flat = Math.abs(value) < 5
  const up = value > 0
  const good = lowerIsBetter ? !up : up
  const Icon = flat ? null : up ? ArrowUpRight : ArrowDownRight
  const shown = absolute !== undefined ? Math.abs(absolute) : Math.round(Math.abs(value))
  const sign = up ? '+' : value < 0 ? '−' : ''
  return (
    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs">
      <span
        className="flex items-center gap-0.5 font-medium"
        style={{ color: flat ? 'var(--muted-foreground)' : good ? '#0ca30c' : '#e66767' }}
      >
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
        {sign}
        {absolute !== undefined ? nf.format(shown) : `${fmt(shown)} %`}
      </span>
      <span className="text-muted-foreground">{suffix}</span>
    </p>
  )
}

export function StatTile({
  label,
  value,
  note,
  delta,
  deltaSuffix,
  lowerIsBetter,
  absolute,
}: {
  label: string
  value: string
  note?: string
  delta: number | null
  deltaSuffix: string
  lowerIsBetter?: boolean
  absolute?: number
}) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
        <Delta value={delta} suffix={deltaSuffix} lowerIsBetter={lowerIsBetter} absolute={absolute} />
      </CardContent>
    </Card>
  )
}

/** Thin meter: share of a whole (fill on a lighter track of the same hue). */
export function ShareMeter({ part, whole, label }: { part: number; whole: number; label: string }) {
  const pct = whole ? Math.round((part / whole) * 100) : 0
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {fmt(part)} de {fmt(whole)} · {fmt(pct)} %
        </span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full"
        style={{ background: 'rgba(57,135,229,0.22)' }}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#3987e5' }} />
      </div>
    </div>
  )
}
