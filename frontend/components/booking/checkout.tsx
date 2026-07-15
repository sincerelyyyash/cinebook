'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Ticket, Warning } from '@phosphor-icons/react/ssr'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Countdown } from '@/components/ui/countdown'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { OrderSummary } from './order-summary'
import { PromoInput } from './promo-input'
import { PaymentForm } from './payment-form'
import { useToast } from '@/components/providers/toast-provider'
import { getBooking, startPayment, confirmPayment } from '@/lib/api/booking'
import { ApiError } from '@/lib/api/client'
import { formatDateTime } from '@/lib/format/datetime'
import type { BookingDto } from '@/lib/api/dto'

type Phase = 'loading' | 'ready' | 'expired' | 'error'

/** Checkout: promo + simulated payment for a PENDING booking. */
export function Checkout({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const toast = useToast()
  const [booking, setBooking] = useState<BookingDto | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [processing, setProcessing] = useState(false)
  const [breakerOpen, setBreakerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const b = await getBooking(bookingId)
        if (cancelled) return
        // Already finalized → view it on the booking page.
        if (b.status !== 'PENDING') {
          router.replace(`/bookings/${b.id}`)
          return
        }
        setBooking(b)
        setPhase('ready')
      } catch {
        if (!cancelled) setPhase('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bookingId, router])

  async function pay(cardNumber: string) {
    if (!booking) return
    setProcessing(true)
    setBreakerOpen(false)
    try {
      await startPayment(booking.id)
      const result = await confirmPayment(booking.id, cardNumber)
      toast.success('Payment successful', `Booking ${result.booking.code} confirmed.`)
      router.push(`/bookings/${booking.id}?confirmed=1`)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PAYMENT_UNAVAILABLE') {
        setBreakerOpen(true)
      } else if (err instanceof ApiError && err.code === 'PAYMENT_FAILED') {
        toast.error('Payment declined', err.message)
      } else if (err instanceof ApiError && err.code === 'HOLD_EXPIRED') {
        setPhase('expired')
      } else if (err instanceof ApiError) {
        toast.error('Payment failed', err.message)
      } else {
        toast.error('Payment failed', 'Please try again.')
      }
      setProcessing(false)
    }
  }

  if (phase === 'loading') {
    return (
      <Shell>
        <Skeleton className="h-64 w-full rounded-xl" />
      </Shell>
    )
  }

  if (phase === 'error' || !booking) {
    return (
      <Shell>
        <Card>
          <EmptyState
            icon={Warning}
            title="Booking not found"
            description="This checkout link is invalid or has expired."
            action={<Link href="/movies"><Button variant="secondary" size="sm">Browse movies</Button></Link>}
          />
        </Card>
      </Shell>
    )
  }

  if (phase === 'expired') {
    return (
      <Shell>
        <Card>
          <EmptyState
            icon={Clock}
            title="Your seat hold expired"
            description="Holds last 5 minutes. Please pick your seats again."
            action={
              <Link href={`/shows/${booking.show.id}/seats`}>
                <Button variant="accent" size="sm">Select seats again</Button>
              </Link>
            }
          />
        </Card>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="flex items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-3">
          <Link href={`/shows/${booking.show.id}/seats`} className="interactive h-8 w-8 rounded-md border border-line-2 flex items-center justify-center text-ink-2 hover:text-ink">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Checkout</h1>
            <p className="text-sm text-ink-2">
              {booking.show.movieTitle} · {booking.show.screenName} · {formatDateTime(booking.show.startsAt)}
            </p>
          </div>
        </div>
        <Countdown expiresAt={booking.expiresAt} onExpire={() => setPhase('expired')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
        {/* Payment */}
        <Card className="p-5 flex flex-col gap-5 order-2 lg:order-1">
          {breakerOpen && (
            <div className="flex items-start gap-2.5 rounded-lg status-warning p-3">
              <Warning size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Payments temporarily unavailable</p>
                <p className="text-xs opacity-80">The gateway is recovering. Please retry in a few seconds.</p>
              </div>
            </div>
          )}
          <PaymentForm amount={booking.total} processing={processing} onPay={pay} />
        </Card>

        {/* Summary */}
        <Card className="p-5 flex flex-col gap-4 order-1 lg:order-2">
          <div className="flex items-center gap-2">
            <Ticket size={16} className="text-accent" />
            <h2 className="text-sm font-medium text-ink">Order summary</h2>
          </div>
          <OrderSummary booking={booking} />
          <div className="h-px bg-line" />
          <PromoInput
            bookingId={booking.id}
            applied={booking.promoCode}
            onApplied={(b) => setBooking(b)}
          />
        </Card>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 flex flex-col gap-4">{children}</div>
}
