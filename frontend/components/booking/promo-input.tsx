'use client'

import { useState } from 'react'
import { Check, CircleNotch, Tag } from '@phosphor-icons/react/ssr'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { applyPromo } from '@/lib/api/booking'
import { ApiError } from '@/lib/api/client'
import type { BookingDto } from '@/lib/api/dto'

/** Apply a promo code to the PENDING booking; lifts the updated booking up. */
export function PromoInput({
  bookingId,
  applied,
  onApplied,
}: {
  bookingId: string
  applied: string | null
  onApplied: (booking: BookingDto) => void
}) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function apply(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    try {
      const booking = await applyPromo(bookingId, code.trim())
      onApplied(booking)
      setCode('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not apply that code.')
    } finally {
      setLoading(false)
    }
  }

  if (applied) {
    return (
      <div className="flex items-center gap-2 text-sm text-positive-ink">
        <Check size={15} />
        Promo <span className="font-mono font-medium">{applied}</span> applied
      </div>
    )
  }

  return (
    <form onSubmit={apply} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input
            placeholder="Promo code"
            className="pl-9 uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            invalid={!!error}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!code.trim() || loading}>
          {loading ? <CircleNotch size={15} className="animate-spin-slow" /> : 'Apply'}
        </Button>
      </div>
      {error && <span className="text-xs text-danger-ink">{error}</span>}
    </form>
  )
}
