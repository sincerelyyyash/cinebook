'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { color } from '@/lib/design/tokens'

export interface TrendPoint {
  label: string
  value: number
}

/** Minimal area trend chart themed from the design tokens. */
export function TrendChart({ data, height = 220 }: { data: TrendPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="cb-accent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: color.overlay,
            border: `1px solid ${color.line2}`,
            borderRadius: 8,
            fontSize: 12,
            color: color.ink,
          }}
          labelStyle={{ color: color.ink2 }}
          cursor={{ stroke: color.lineStrong }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color.accent}
          strokeWidth={2}
          fill="url(#cb-accent)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
