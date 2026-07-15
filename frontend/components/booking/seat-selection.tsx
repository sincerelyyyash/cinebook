'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CircleNotch, Ticket } from '@phosphor-icons/react/ssr'
import { SeatMap } from '@/components/seatmap/seat-map'
import { SeatLegend } from '@/components/seatmap/seat-legend'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { LiveDot, Skeleton } from '@/components/ui/feedback'
import { useToast } from '@/components/providers/toast-provider'
import { useAvailability } from '@/lib/hooks/use-availability'
import { holdSeats, createBooking } from '@/lib/api/booking'
import { ApiError } from '@/lib/api/client'
import { formatDateTime } from '@/lib/format/datetime'
import { MAX_SEATS } from '@/lib/seat'
import type { ShowDetail } from '@/lib/api/dto'
import type { SeatAvailability } from '@/lib/api/dto'

const FORMAT_LABEL: Record<string, string> = { TWO_D: '2D', THREE_D: '3D' }

/** Client seat-selection surface: live map, selection, 5-min hold → booking. */
export function SeatSelection({ show }: { show: ShowDetail }) {
  const router = useRouter()
  const toast = useToast()
  const { data, loading, error, live, refresh } = useAvailability(show.id)
  const [selected, setSelected] = useState<Map<string, SeatAvailability>>(new Map())
  const [submitting, setSubmitting] = useState(false)

  const selectedIds = useMemo(() => new Set(selected.keys()), [selected])
  const subtotal = useMemo(
    () => [...selected.values()].reduce((sum, s) => sum + s.price, 0),
    [selected],
  )

  function toggle(seat: SeatAvailability) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(seat.id)) next.delete(seat.id)
      else {
        if (next.size >= MAX_SEATS) {
          toast.error('Seat limit reached', `You can hold up to ${MAX_SEATS} seats at once.`)
          return prev
        }
        next.set(seat.id, seat)
      }
      return next
    })
  }

  async function proceed() {
    if (selected.size === 0) return
    setSubmitting(true)
    try {
      const hold = await holdSeats(show.id, [...selected.keys()])
      const booking = await createBooking(hold.id)
      router.push(`/checkout/${booking.id}`)
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'SEAT_UNAVAILABLE' || err.code === 'CONFLICT')) {
        toast.error('Some seats were just taken', 'Availability refreshed. Please pick again.')
        setSelected(new Map())
        refresh()
      } else if (err instanceof ApiError && err.status === 429) {
        toast.error('Too many booking attempts', `Try again in ${err.retryAfter ?? 3600}s.`)
      } else if (err instanceof ApiError) {
        toast.error('Could not hold seats', err.message)
      } else {
        toast.error('Could not hold seats', 'Please try again.')
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href={`/movies/${show.movieId}`}
            className="interactive mt-0.5 h-8 w-8 rounded-md border border-line-2 flex items-center justify-center text-ink-2 hover:text-ink"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{show.movieTitle}</h1>
            <p className="text-sm text-ink-2">
              {show.theatreName} · {show.screenName} · {formatDateTime(show.startsAt)} ·{' '}
              {FORMAT_LABEL[show.format] ?? show.format}
            </p>
          </div>
        </div>
        {live && <LiveDot label="Live availability" />}
      </div>

      {/* Map */}
      <div className="rounded-xl border border-line-2 bg-surface p-5">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <Skeleton className="h-2 w-64" />
            <Skeleton className="h-40 w-full max-w-md" />
          </div>
        ) : error || !data ? (
          <div className="py-10 text-center text-sm text-danger-ink">{error ?? 'Unavailable'}</div>
        ) : (
          <div className="flex flex-col gap-6">
            <SeatMap seats={data.seats} selected={selectedIds} onToggle={toggle} />
            <SeatLegend priceByCategory={data.priceByCategory} />
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-4 z-20">
        <div className="surface-overlay rounded-xl border border-line-2 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Ticket size={18} className="text-accent shrink-0" />
            {selected.size === 0 ? (
              <span className="text-sm text-ink-2">Select seats to continue</span>
            ) : (
              <div className="min-w-0">
                <p className="text-sm text-ink truncate">
                  {[...selected.values()]
                    .map((s) => `${s.row}${s.number}`)
                    .sort()
                    .join(', ')}
                </p>
                <p className="text-xs text-ink-3">
                  {selected.size} seat{selected.size > 1 ? 's' : ''} · <Money paise={subtotal} />
                </p>
              </div>
            )}
          </div>
          <Button variant="accent" onClick={proceed} disabled={selected.size === 0 || submitting}>
            {submitting ? (
              <>
                <CircleNotch size={15} className="animate-spin-slow" /> Holding…
              </>
            ) : (
              <>Hold &amp; checkout</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
