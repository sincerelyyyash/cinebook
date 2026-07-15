'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Armchair, ArrowsClockwise, CurrencyInr, Ticket } from '@phosphor-icons/react/ssr'
import { PageHeader } from '@/components/shell/dashboard-shell'
import { StatCard, Panel } from '@/components/ui/card'
import { CountUp } from '@/components/ui/count-up'
import { Skeleton } from '@/components/ui/feedback'
import { SimpleBarChart, type BarPoint } from '@/components/charts/bar-chart'
import { reportSummary, revenueSeries, topMovies } from '@/lib/api/admin'
import { formatMoney, toRupees } from '@/lib/format/money'
import { formatDate } from '@/lib/format/datetime'
import type { ReportSummary, RevenuePoint, TopMovie } from '@/lib/api/dto'

export function OverviewView() {
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [points, setPoints] = useState<RevenuePoint[] | null>(null)
  const [movies, setMovies] = useState<TopMovie[] | null>(null)

  useEffect(() => {
    let on = true
    void (async () => {
      const [s, r, m] = await Promise.all([
        reportSummary().catch(() => null),
        revenueSeries('daily').catch(() => null),
        topMovies(6).catch(() => []),
      ])
      if (!on) return
      setSummary(s)
      setPoints(r?.points ?? [])
      setMovies(m)
    })()
    return () => {
      on = false
    }
  }, [])

  const bars: BarPoint[] = (points ?? []).map((p) => ({
    label: formatDate(p.period).replace(/ \d{4}$/, ''),
    value: toRupees(p.revenue),
  }))

  return (
    <>
      <PageHeader title="Overview" description="Platform health at a glance" />
      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Net revenue" icon={CurrencyInr} loading={!summary}>
            {summary && <CountUp value={summary.netRevenue} format={formatMoney} />}
          </Stat>
          <Stat label="Confirmed bookings" icon={Ticket} loading={!summary}>
            {summary && <CountUp value={summary.confirmedBookings} />}
          </Stat>
          <Stat label="Seats sold" icon={Armchair} loading={!summary}>
            {summary && <CountUp value={summary.seatsSold} />}
          </Stat>
          <Stat label="Refunded" icon={ArrowsClockwise} loading={!summary} sub={summary ? `${summary.refundedBookings} bookings` : undefined}>
            {summary && <CountUp value={summary.refundedAmount} format={formatMoney} />}
          </Stat>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          <Panel title="Revenue" hint="Confirmed bookings, by day">
            {points === null ? (
              <Skeleton className="h-56 w-full" />
            ) : bars.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-3">No revenue in this period yet.</p>
            ) : (
              <SimpleBarChart data={bars} valueFormatter={(v) => `₹${Math.round(v).toLocaleString()}`} />
            )}
          </Panel>

          <Panel title="Top movies" hint="By revenue">
            {movies === null ? (
              <Skeleton className="h-56 w-full" />
            ) : movies.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-3">No bookings yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {movies.map((m, i) => (
                  <div key={m.movieId} className="flex items-center gap-3">
                    <span className="text-xs text-ink-dim font-mono w-4">{i + 1}</span>
                    <Link href={`/catalog`} className="text-sm text-ink truncate flex-1 hover:text-accent">
                      {m.title}
                    </Link>
                    <span className="text-xs text-ink-3">{m.bookings}</span>
                    <span className="text-sm text-ink-2 w-20 text-right">{formatMoney(m.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}

function Stat({
  label,
  icon,
  children,
  sub,
  loading,
}: {
  label: string
  icon: React.ElementType
  children: React.ReactNode
  sub?: string
  loading?: boolean
}) {
  return (
    <StatCard label={label} icon={icon} value={loading ? <Skeleton className="h-7 w-24" /> : children} sub={sub} />
  )
}
