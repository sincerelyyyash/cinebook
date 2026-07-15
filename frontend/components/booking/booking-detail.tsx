'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, CheckCircle, MapPin, Ticket } from '@phosphor-icons/react/ssr'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/badge'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { OrderSummary } from './order-summary'
import { useToast } from '@/components/providers/toast-provider'
import { getBooking, cancelBooking, refundPayment } from '@/lib/api/booking'
import { ApiError } from '@/lib/api/client'
import { formatDateTime } from '@/lib/format/datetime'
import type { BookingDto } from '@/lib/api/dto'
import type { PaymentStatus } from '@/lib/types'

export function BookingDetail({ bookingId }: { bookingId: string }) {
  const params = useSearchParams()
  const justConfirmed = params.get('confirmed') === '1'
  const toast = useToast()
  const [booking, setBooking] = useState<BookingDto | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [acting, setActing] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const b = await getBooking(bookingId)
        if (!cancelled) {
          setBooking(b)
          setState('ready')
        }
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bookingId])

  async function doCancel() {
    setActing(true)
    try {
      const b = await cancelBooking(bookingId)
      setBooking(b)
      toast.success('Booking cancelled')
    } catch (err) {
      toast.error('Could not cancel', err instanceof ApiError ? err.message : 'Please try again.')
    } finally {
      setActing(false)
    }
  }

  async function doRefund() {
    setActing(true)
    try {
      const { booking: b } = await refundPayment(bookingId)
      setBooking(b)
      toast.success('Refund issued')
    } catch (err) {
      toast.error('Could not refund', err instanceof ApiError ? err.message : 'Please try again.')
    } finally {
      setActing(false)
    }
  }

  if (state === 'loading') return <Shell><Skeleton className="h-72 w-full rounded-xl" /></Shell>
  if (state === 'error' || !booking) {
    return (
      <Shell>
        <Card>
          <EmptyState icon={Ticket} title="Booking not found" description="This booking doesn’t exist or isn’t yours." />
        </Card>
      </Shell>
    )
  }

  const canCancel = booking.status === 'CONFIRMED' || booking.status === 'PENDING'
  const canRefund = booking.status === 'CONFIRMED' && booking.payment?.status === 'SUCCEEDED'

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <Link href="/bookings" className="interactive h-8 w-8 rounded-md border border-line-2 flex items-center justify-center text-ink-2 hover:text-ink">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">Booking details</h1>
      </div>

      {(justConfirmed || booking.status === 'CONFIRMED') && (
        <motion.div
          initial={justConfirmed ? { opacity: 0, y: 8, scale: 0.98 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="flex items-center gap-3 rounded-xl status-positive p-4"
        >
          <motion.span
            initial={justConfirmed ? { scale: 0, rotate: -30 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 16, delay: justConfirmed ? 0.1 : 0 }}
            className="shrink-0"
          >
            <CheckCircle size={20} />
          </motion.span>
          <div>
            <p className="text-sm font-medium">Booking confirmed</p>
            <p className="text-xs opacity-80">Show this code at the counter: <span className="font-mono font-medium">{booking.code}</span></p>
          </div>
        </motion.div>
      )}

      <Card className="p-5 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{booking.show.movieTitle}</h2>
            <p className="text-sm text-ink-2 mt-1 flex items-center gap-1.5">
              <MapPin size={14} /> {booking.show.theatreName} · {booking.show.screenName} · {booking.show.city}
            </p>
            <p className="text-sm text-ink-2 mt-0.5 flex items-center gap-1.5">
              <Calendar size={14} /> {formatDateTime(booking.show.startsAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <BookingStatusBadge status={booking.status} />
            {booking.payment && <PaymentStatusBadge status={booking.payment.status as PaymentStatus} />}
          </div>
        </div>

        <div className="h-px bg-line" />
        <OrderSummary booking={booking} />

        {booking.payment?.transactionId && (
          <p className="text-xs text-ink-3">
            Transaction <span className="font-mono">{booking.payment.transactionId}</span>
          </p>
        )}

        {(canCancel || canRefund) && (
          <>
            <div className="h-px bg-line" />
            <div className="flex gap-2">
              {canRefund && (
                <Button variant="secondary" size="sm" onClick={doRefund} loading={acting}>
                  Refund
                </Button>
              )}
              {canCancel && (
                <Button variant="danger" size="sm" onClick={doCancel} loading={acting}>
                  Cancel booking
                </Button>
              )}
            </div>
          </>
        )}
      </Card>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-4">{children}</div>
}
