'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getAvailability } from '@/lib/api/booking'
import { subscribeSeats } from '@/lib/realtime/ws-client'
import type { ShowAvailability, SeatAvailability, SeatStatus } from '@/lib/api/dto'

export interface UseAvailability {
  data: ShowAvailability | null
  loading: boolean
  error: string | null
  live: boolean
  refresh: () => void
}

/**
 * Live seat availability for a show. Seeds from GET /shows/:id/seats (full seat
 * detail incl. category/price/heldByMe), then applies WebSocket snapshots (which
 * carry only id+status) as a status overlay. Falls back to polling when the
 * socket can't connect. `holdId` lets the initial fetch mark the caller's own
 * held seats.
 */
export function useAvailability(showId: string, holdId?: string): UseAvailability {
  const [data, setData] = useState<ShowAvailability | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNow = useCallback(async () => {
    try {
      const fresh = await getAvailability(showId, holdId)
      setData(fresh)
      setError(null)
    } catch {
      setError('Could not load seat availability.')
    } finally {
      setLoading(false)
    }
  }, [showId, holdId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const fresh = await getAvailability(showId, holdId).catch(() => null)
      if (cancelled) return
      if (fresh) setData(fresh)
      else setError('Could not load seat availability.')
      setLoading(false)
    })()

    const channel = subscribeSeats(
      showId,
      (snap) => {
        // Overlay live statuses onto the detailed seat list.
        const statusById = new Map<string, SeatStatus>(snap.seats.map((s) => [s.id, s.status]))
        setData((prev) => {
          if (!prev) return prev
          const seats: SeatAvailability[] = prev.seats.map((seat) => {
            const next = statusById.get(seat.id)
            if (!next || next === seat.status) return seat
            // A seat leaving HELD/BOOKED is no longer ours.
            return { ...seat, status: next, heldByMe: next === 'HELD' ? seat.heldByMe : false }
          })
          return { ...prev, summary: snap.summary, seats }
        })
      },
      (status) => {
        if (status === 'open') {
          setLive(true)
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        } else {
          setLive(false)
          // Poll fallback while disconnected.
          if (!pollRef.current) {
            pollRef.current = setInterval(() => void fetchNow(), 5000)
          }
        }
      },
    )

    return () => {
      cancelled = true
      channel.close()
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId, holdId])

  return { data, loading, error, live, refresh: fetchNow }
}
