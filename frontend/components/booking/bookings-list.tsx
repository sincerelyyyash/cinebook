'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CaretRight, Ticket } from '@phosphor-icons/react/ssr'
import { Card } from '@/components/ui/card'
import { Money } from '@/components/ui/money'
import { BookingStatusBadge } from '@/components/ui/badge'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { Reveal } from '@/components/ui/reveal'
import { listBookings } from '@/lib/api/booking'
import { formatDateTime } from '@/lib/format/datetime'
import type { BookingDto } from '@/lib/api/dto'

export function BookingsList() {
  const [bookings, setBookings] = useState<BookingDto[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await listBookings(1, 50)
        if (!cancelled) setBookings(res.data)
      } catch {
        if (!cancelled) setError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (bookings === null && !error) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <EmptyState icon={Ticket} title="Couldn’t load your bookings" description="Please refresh and try again." />
      </Card>
    )
  }

  if (!bookings || bookings.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Ticket}
          title="No bookings yet"
          description="Your confirmed and past bookings will appear here."
          action={
            <Link href="/movies" className="text-sm text-accent hover:underline">
              Browse movies →
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {bookings.map((b, i) => (
        <Reveal key={b.id} index={i} as="div">
        <Link href={`/bookings/${b.id}`}>
          <Card className="p-4 flex items-center gap-4 hover:border-line-strong hover:-translate-y-px transition-all duration-150">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-ink truncate">{b.show.movieTitle}</span>
                <BookingStatusBadge status={b.status} />
              </div>
              <p className="text-xs text-ink-3 truncate">
                {b.show.theatreName} · {b.show.screenName} · {formatDateTime(b.show.startsAt)}
              </p>
              <p className="text-xs text-ink-3 mt-0.5">
                {b.seats.map((s) => s.label).join(', ')} · <span className="font-mono">{b.code}</span>
              </p>
            </div>
            <Money paise={b.total} className="text-ink-2" />
            <CaretRight size={16} className="text-ink-dim shrink-0" />
          </Card>
        </Link>
        </Reveal>
      ))}
    </div>
  )
}
