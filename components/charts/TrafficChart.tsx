'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  date: string
  traffic: number
  previous?: number
}

interface TrafficChartProps {
  data: DataPoint[]
}

export default function TrafficChart({ data }: TrafficChartProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--foreground))',
            }}
          />
          <Area type="monotone" dataKey="previous" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted))" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="traffic" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
