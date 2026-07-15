import { wsUrl } from '@/lib/env'
import type { SeatStatus } from '@/lib/api/dto'

/**
 * Live seat-availability WebSocket client. Speaks the backend protocol (src/
 * realtime/ws.ts): one socket at `/ws`, subscribe per show, receive full
 * availability snapshots on every change.
 *
 *   client → { action: 'subscribe',   showId }
 *   client → { action: 'unsubscribe', showId }
 *   server → { type: 'availability', showId, summary, seats: [{ id, status }] }
 *
 * Reconnecting; the seat page maps snapshots onto its state and falls back to
 * polling GET /shows/:id/seats when the socket can't connect.
 */

export interface AvailabilitySnapshot {
  showId: string
  summary: { total: number; available: number; held: number; booked: number }
  seats: { id: string; status: SeatStatus }[]
}

export interface SeatChannel {
  close: () => void
}

export function subscribeSeats(
  showId: string,
  onSnapshot: (s: AvailabilitySnapshot) => void,
  onStatus?: (status: 'open' | 'closed' | 'error') => void,
): SeatChannel {
  let socket: WebSocket | null = null
  let closedByCaller = false
  let retry = 0

  const connect = () => {
    if (closedByCaller) return
    try {
      socket = new WebSocket(wsUrl)
    } catch {
      onStatus?.('error')
      scheduleReconnect()
      return
    }

    socket.onopen = () => {
      retry = 0
      onStatus?.('open')
      socket?.send(JSON.stringify({ action: 'subscribe', showId }))
    }

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg?.type === 'availability' && msg.showId === showId) {
          onSnapshot({ showId, summary: msg.summary, seats: msg.seats })
        }
      } catch {
        /* ignore malformed frames */
      }
    }

    socket.onerror = () => onStatus?.('error')

    socket.onclose = () => {
      onStatus?.('closed')
      scheduleReconnect()
    }
  }

  const scheduleReconnect = () => {
    if (closedByCaller) return
    retry += 1
    const delay = Math.min(1000 * 2 ** retry, 15000)
    setTimeout(connect, delay)
  }

  connect()

  return {
    close: () => {
      closedByCaller = true
      try {
        if (socket?.readyState === socket?.OPEN) {
          socket?.send(JSON.stringify({ action: 'unsubscribe', showId }))
        }
      } catch {
        /* ignore */
      }
      socket?.close()
    },
  }
}
