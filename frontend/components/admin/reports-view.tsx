'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/shell/dashboard-shell'
import { StatCard, Panel } from '@/components/ui/card'
import { Money } from '@/components/ui/money'
import { CountUp } from '@/components/ui/count-up'
import { Skeleton } from '@/components/ui/feedback'
import { DataTable } from '@/components/admin/data-table'
import { SimpleBarChart, type BarPoint } from '@/components/charts/bar-chart'
import { reportSummary, revenueSeries, topMovies, topTheatres } from '@/lib/api/admin'
import { formatMoney, toRupees } from '@/lib/format/money'
import { formatDate } from '@/lib/format/datetime'
import { cn } from '@/lib/design/cn'
import type { ReportSummary, RevenuePoint, TopMovie, TopTheatre } from '@/lib/api/dto'

type Gran = 'daily' | 'weekly' | 'monthly'
const GRANS: Gran[] = ['daily', 'weekly', 'monthly']

export function ReportsView() {
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [gran, setGran] = useState<Gran>('daily')
  const [points, setPoints] = useState<RevenuePoint[] | null>(null)
  const [movies, setMovies] = useState<TopMovie[] | null>(null)
  const [theatres, setTheatres] = useState<TopTheatre[] | null>(null)

  useEffect(() => {
    void reportSummary().then(setSummary).catch(() => setSummary(null))
    void topMovies(10).then(setMovies).catch(() => setMovies([]))
    void topTheatres(10).then(setTheatres).catch(() => setTheatres([]))
  }, [])

  useEffect(() => {
    setPoints(null)
    void revenueSeries(gran).then((r) => setPoints(r.points)).catch(() => setPoints([]))
  }, [gran])

  const bars: BarPoint[] = (points ?? []).map((p) => ({
    label: formatDate(p.period).replace(/ \d{4}$/, ''),
    value: toRupees(p.revenue),
  }))

  return (
    <>
      <PageHeader title="Reports" description="Bookings & revenue summaries" />
      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Gross revenue" value={summary ? <CountUp value={summary.grossRevenue} format={formatMoney} /> : <Skeleton className="h-7 w-24" />} />
          <StatCard label="Net revenue" value={summary ? <CountUp value={summary.netRevenue} format={formatMoney} /> : <Skeleton className="h-7 w-24" />} />
          <StatCard label="Confirmed" value={summary ? <CountUp value={summary.confirmedBookings} /> : <Skeleton className="h-7 w-16" />} sub="bookings" />
          <StatCard label="Seats sold" value={summary ? <CountUp value={summary.seatsSold} /> : <Skeleton className="h-7 w-16" />} />
        </div>

        <Panel
          title="Revenue over time"
          right={
            <div className="flex gap-1">
              {GRANS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGran(g)}
                  className={cn(
                    'h-7 px-2.5 rounded-md text-xs capitalize border transition-colors-fast',
                    g === gran ? 'bg-accent-bg text-accent border-accent' : 'bg-surface text-ink-2 border-line-2 hover:border-line-strong',
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          }
        >
          {points === null ? (
            <Skeleton className="h-60 w-full" />
          ) : bars.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-3">No revenue in this range yet.</p>
          ) : (
            <SimpleBarChart data={bars} valueFormatter={(v) => `₹${Math.round(v).toLocaleString()}`} />
          )}
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-label">Top movies</h3>
            <DataTable
              rowKey={(m: TopMovie) => m.movieId}
              rows={movies}
              empty="No bookings yet."
              columns={[
                { key: 'title', header: 'Movie', render: (m) => <span className="text-ink">{m.title}</span> },
                { key: 'bookings', header: 'Bookings', align: 'right', render: (m) => m.bookings },
                { key: 'rev', header: 'Revenue', align: 'right', render: (m) => <Money paise={m.revenue} className="text-ink-2" /> },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-label">Top theatres</h3>
            <DataTable
              rowKey={(t: TopTheatre) => t.theatreId}
              rows={theatres}
              empty="No bookings yet."
              columns={[
                { key: 'name', header: 'Theatre', render: (t) => <span className="text-ink">{t.name}</span> },
                { key: 'chain', header: 'Chain', render: (t) => <span className="text-ink-3">{t.chain}</span> },
                { key: 'bookings', header: 'Bookings', align: 'right', render: (t) => t.bookings },
                { key: 'rev', header: 'Revenue', align: 'right', render: (t) => <Money paise={t.revenue} className="text-ink-2" /> },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  )
}
