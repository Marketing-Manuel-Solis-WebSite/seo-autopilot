'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ResultadosContacts, ResultadosDaily, ResultadosMonth } from '@/lib/resultados/types'
import { monthLong, monthShort } from '@/lib/resultados/types'

/*
 * Colors: reference categorical palette, dark steps (the app is dark-only),
 * validated against the card surface #111114 — all checks pass, worst adjacent
 * CVD ΔE 8.4. Slots are assigned in fixed order and follow the entity.
 */
const VIZ_VARS = {
  '--series-1': '#3987e5',
  '--series-2': '#d95926',
  '--series-3': '#199e70',
  '--series-4': '#c98500',
  '--viz-grid': 'rgba(255,255,255,0.07)',
  '--viz-axis': '#383835',
} as React.CSSProperties

const nf = new Intl.NumberFormat('es-MX')
const compact = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 })
const fmt = (n: number) => nf.format(n)

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 }

function VizRoot({ children, height }: { children: React.ReactNode; height: number }) {
  // Height includes the x-axis band so the card never gets a nested scroll
  return (
    <div style={{ ...VIZ_VARS, height }} className="w-full">
      {children}
    </div>
  )
}

interface TooltipRow {
  label: string
  value: string
  color?: string
}

function TooltipCard({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{title}</p>
      {rows.map(r => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {r.color && <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-medium tabular-nums text-foreground">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function LegendRow({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" style={VIZ_VARS}>
      {items.map(i => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/* ── Monthly single-series columns (impressions or clicks) ─────────────── */

export function MonthlyColumns({
  months,
  metric,
  label,
}: {
  months: ResultadosMonth[]
  metric: 'gscImpressions' | 'gscClicks'
  label: string
}) {
  const data = months.map(m => ({ name: monthShort(m.month), month: m.month, value: m[metric] }))
  const lastIndex = data.length - 1
  return (
    <VizRoot height={240}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--viz-axis)' }} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} tickFormatter={v => compact.format(v)} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipCard
                  title={monthLong(String(payload[0].payload.month))}
                  rows={[{ label, value: fmt(Number(payload[0].value)), color: 'var(--series-1)' }]}
                />
              ) : null
            }
          />
          <Bar dataKey="value" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={24}>
            <LabelList
              dataKey="value"
              position="top"
              content={(props) => {
                const { x, y, width, value, index } = props as { x: number; y: number; width: number; value: number; index: number }
                if (index !== lastIndex) return null
                return (
                  <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="var(--foreground)" fontSize={12} fontWeight={600}>
                    {fmt(value)}
                  </text>
                )
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </VizRoot>
  )
}

/* ── Daily clicks line (Sep → Nov) ─────────────────────────────────────── */

function dayLabel(date: string) {
  const d = Number(date.slice(8, 10))
  return `${d} ${monthShort(date)}`
}

export function DailyClicks({ daily }: { daily: ResultadosDaily[] }) {
  const data = daily.map(d => ({ ...d, name: dayLabel(d.date) }))
  const last = data[data.length - 1]
  return (
    <VizRoot height={260}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 56, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis
            dataKey="name"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--viz-axis)' }}
            interval={6}
            minTickGap={16}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipCard
                  title={String(payload[0].payload.name)}
                  rows={[
                    { label: 'Clics', value: fmt(Number(payload[0].payload.clicks)), color: 'var(--series-1)' },
                    { label: 'Impresiones', value: fmt(Number(payload[0].payload.impressions)) },
                  ]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="clicks"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="var(--series-1)"
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--series-1)' }}
          >
            <LabelList
              dataKey="clicks"
              content={(props) => {
                const { x, y, index } = props as { x: number; y: number; index: number }
                if (index !== data.length - 1 || !last) return null
                return (
                  <text x={x + 8} y={y + 4} fill="var(--foreground)" fontSize={12} fontWeight={600}>
                    {fmt(last.clicks)}
                  </text>
                )
              }}
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </VizRoot>
  )
}

/* ── Organic sessions on www (GA4) ─────────────────────────────────────── */

export function OrganicSessions({ months }: { months: ResultadosMonth[] }) {
  const data = months
    .filter(m => typeof m.ga4OrganicWww === 'number')
    .map(m => ({ name: monthShort(m.month), month: m.month, value: m.ga4OrganicWww as number, partial: m.partial?.ga4 }))
  const lastIndex = data.length - 1
  return (
    <VizRoot height={240}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 56, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--viz-axis)' }} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} tickFormatter={v => compact.format(v)} domain={[0, 'auto']} />
          <Tooltip
            cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipCard
                  title={`${monthLong(String(payload[0].payload.month))}${payload[0].payload.partial ? ` (${payload[0].payload.partial})` : ''}`}
                  rows={[{ label: 'Sesiones orgánicas', value: fmt(Number(payload[0].value)), color: 'var(--series-1)' }]}
                />
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--series-1)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, fill: 'var(--series-1)', stroke: 'var(--card)', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: 'var(--series-1)', stroke: 'var(--card)', strokeWidth: 2 }}
          >
            <LabelList
              dataKey="value"
              content={(props) => {
                const { x, y, value, index } = props as { x: number; y: number; value: number; index: number }
                if (index !== lastIndex) return null
                return (
                  <text x={x + 10} y={y + 4} fill="var(--foreground)" fontSize={12} fontWeight={600}>
                    {fmt(value)}
                  </text>
                )
              }}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </VizRoot>
  )
}

/* ── Work shipped per month: posts and new pages (grouped) ─────────────── */

export function WorkShipped({ months }: { months: ResultadosMonth[] }) {
  const data = months.map(m => ({
    name: monthShort(m.month),
    month: m.month,
    posts: m.postsPublished,
    pages: m.newPages,
    commits: m.commits,
    scheduled: m.postsScheduled ?? 0,
  }))
  return (
    <VizRoot height={240}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--viz-axis)' }} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as (typeof data)[number]
              const rows: TooltipRow[] = [
                { label: 'Páginas nuevas', value: fmt(p.pages), color: 'var(--series-1)' },
                { label: 'Posts publicados', value: fmt(p.posts) },
                { label: 'Cambios al sitio (commits)', value: fmt(p.commits) },
              ]
              if (p.scheduled) rows.splice(2, 0, { label: 'Posts programados', value: fmt(p.scheduled) })
              return <TooltipCard title={monthLong(p.month)} rows={rows} />
            }}
          />
          <Bar dataKey="pages" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={24}>
            <LabelList
              dataKey="pages"
              position="top"
              content={(props) => {
                const { x, y, width, value } = props as { x: number; y: number; width: number; value: number }
                // Label the peaks only (never a number on every bar)
                const max = Math.max(...data.map(d => d.pages))
                if (value < max * 0.6) return null
                return (
                  <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="var(--foreground)" fontSize={12} fontWeight={600}>
                    {fmt(value)}
                  </text>
                )
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </VizRoot>
  )
}

/* ── Contacts measured in GA4 (stacked) ───────────────────────────────── */

export const CONTACT_SERIES = [
  { key: 'phone', label: 'Llamada', color: 'var(--series-1)' },
  { key: 'whatsapp', label: 'WhatsApp', color: 'var(--series-2)' },
  { key: 'consulta', label: 'Consulta', color: 'var(--series-3)' },
  { key: 'form', label: 'Formulario', color: 'var(--series-4)' },
] as const

export function ContactsStacked({ contacts }: { contacts: ResultadosContacts[] }) {
  const data = contacts.map(c => {
    const isPartial = c.days < 28
    return {
      ...c,
      name: isPartial ? `${monthShort(c.month)} (1–${Number(c.through.slice(8, 10))})` : monthShort(c.month),
      total: c.phone + c.whatsapp + c.consulta + c.form,
    }
  })
  return (
    <VizRoot height={240}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--viz-axis)' }} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as (typeof data)[number]
              return (
                <TooltipCard
                  title={`${p.name} · ${fmt(p.total)} contactos`}
                  rows={CONTACT_SERIES.map(s => ({ label: s.label, value: fmt(p[s.key]), color: s.color }))}
                />
              )
            }}
          />
          {CONTACT_SERIES.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="contacts"
              fill={s.color}
              stroke="var(--card)"
              strokeWidth={2}
              maxBarSize={24}
              radius={i === CONTACT_SERIES.length - 1 ? [4, 4, 0, 0] : 0}
            >
              {i === CONTACT_SERIES.length - 1 && (
                <LabelList
                  dataKey="total"
                  position="top"
                  content={(props) => {
                    const { x, y, width, value } = props as { x: number; y: number; width: number; value: number }
                    return (
                      <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="var(--foreground)" fontSize={12} fontWeight={600}>
                        {fmt(value)}
                      </text>
                    )
                  }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </VizRoot>
  )
}
