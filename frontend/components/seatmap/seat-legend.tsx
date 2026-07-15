import { cn } from '@/lib/design/cn'
import { Money } from '@/components/ui/money'
import { seatCategoryOrder, seatCategoryMeta } from '@/lib/seat'
import type { SeatCategory } from '@/lib/types'

/** Category swatches with per-category pricing + seat-state key. */
export function SeatLegend({
  priceByCategory,
  className,
}: {
  priceByCategory?: Record<SeatCategory, number>
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {seatCategoryOrder.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className={cn('h-3 w-3 rounded-sm', seatCategoryMeta[cat].swatch)} />
            <span className="text-xs text-ink-2">{seatCategoryMeta[cat].label}</span>
            {priceByCategory && (
              <span className="text-xs text-ink-3">
                <Money paise={priceByCategory[cat]} />
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <StateKey className="border-line-strong bg-transparent" label="Available" />
        <StateKey className="border-accent bg-accent" label="Selected" />
        <StateKey className="border-warning-ink bg-warning-bg" label="Held" />
        <StateKey className="border-line-2 bg-seat-booked" label="Sold" />
      </div>
    </div>
  )
}

function StateKey({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-3 w-3 rounded-sm border', className)} />
      <span className="text-xs text-ink-3">{label}</span>
    </div>
  )
}
