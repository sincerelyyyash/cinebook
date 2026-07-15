import { Money } from '@/components/ui/money'
import { seatCategoryMeta } from '@/lib/seat'
import type { BookingDto } from '@/lib/api/dto'

/** Price breakdown for a booking. */
export function OrderSummary({ booking }: { booking: BookingDto }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {booking.seats.map((s) => (
          <div key={s.seatId} className="flex items-center justify-between text-sm">
            <span className="text-ink-2">
              <span className="text-ink font-medium">{s.label}</span>
              <span className="text-ink-3"> · {seatCategoryMeta[s.category].label}</span>
            </span>
            <Money paise={s.price} className="text-ink-2" />
          </div>
        ))}
      </div>

      <div className="h-px bg-line" />

      <div className="flex flex-col gap-1.5 text-sm">
        <Row label="Subtotal" value={<Money paise={booking.subtotal} />} />
        {booking.discount > 0 && (
          <Row
            label={`Discount${booking.promoCode ? ` (${booking.promoCode})` : ''}`}
            value={<span className="text-positive-ink">−<Money paise={booking.discount} /></span>}
          />
        )}
      </div>

      <div className="h-px bg-line" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">Total</span>
        <Money paise={booking.total} className="text-lg font-medium text-ink" />
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-3">{label}</span>
      <span className="text-ink-2">{value}</span>
    </div>
  )
}
