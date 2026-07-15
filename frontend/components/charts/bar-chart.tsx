'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import { color } from '@/lib/design/tokens'

export interface BarPoint {
  label: string
  value: number
}

/** Simple vertical bar chart themed from tokens (used for revenue-by-period). */
export function SimpleBarChart({
  data,
  height = 240,
  valueFormatter,
}: {
  data: BarPoint[]
  height?: number
  valueFormatter?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <XAxis
          dataKey="label"
          stroke={color.ink3}
          tick={{ fontSize: 11, fill: color.ink3 }}
          tickLine={false}
          axisLine={{ stroke: color.line2 }}
        />
        <YAxis
          stroke={color.ink3}
          tick={{ fontSize: 11, fill: color.ink3 }}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={valueFormatter}
        />
        <Tooltip
          cursor={{ fill: color.hover }}
          contentStyle={{
            background: color.overlay,
            border: `1px solid ${color.line2}`,
            borderRadius: 8,
            fontSize: 12,
            color: color.ink,
          }}
          labelStyle={{ color: color.ink2 }}
          formatter={(v: number) => [valueFormatter ? valueFormatter(v) : v, '']}
        />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={color.accent} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
