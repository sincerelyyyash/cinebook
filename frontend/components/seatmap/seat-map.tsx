'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/design/cn'
import { seatCategoryMeta } from '@/lib/seat'
import type { SeatAvailability } from '@/lib/api/dto'

/**
 * Visual seat map. Seats are grouped by row; each seat is color-coded by
 * category and styled by live status. Available seats are selectable; held/sold
 * seats are disabled. Keyboard-navigable (each seat is a button).
 */
export function SeatMap({
  seats,
  selected,
  onToggle,
  className,
}: {
  seats: SeatAvailability[]
  selected: Set<string>
  onToggle: (seat: SeatAvailability) => void
  className?: string
}) {
  const rows = useMemo(() => groupRows(seats), [seats])

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Screen indicator */}
      <div className="w-full max-w-md flex flex-col items-center gap-1">
        <div className="h-1 w-3/4 rounded-full bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />
        <span className="text-2xs uppercase tracking-widest text-ink-dim">Screen this way</span>
      </div>

      <div className="flex flex-col gap-1.5 overflow-x-auto scroll-thin max-w-full py-2">
        {rows.map(([row, rowSeats], ri) => (
          <div key={row} className="flex items-center gap-1.5 animate-enter" style={{ animationDelay: `${Math.min(ri * 30, 300)}ms` }}>
            <span className="w-5 shrink-0 text-2xs text-ink-3 text-center font-mono">{row}</span>
            <div className="flex gap-1">
              {rowSeats.map((seat) => (
                <Seat
                  key={seat.id}
                  seat={seat}
                  selected={selected.has(seat.id)}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Seat({
  seat,
  selected,
  onToggle,
}: {
  seat: SeatAvailability
  selected: boolean
  onToggle: (seat: SeatAvailability) => void
}) {
  const sold = seat.status === 'BOOKED'
  const heldByOther = seat.status === 'HELD' && !seat.heldByMe
  const disabled = sold || heldByOther

  const base = 'h-6 w-6 rounded-sm text-2xs font-mono flex items-center justify-center transition-colors-fast border'

  let stateClasses: string
  if (selected) {
    stateClasses = 'bg-accent text-accent-ink border-accent'
  } else if (sold) {
    stateClasses = 'bg-seat-booked text-ink-dim border-line-2 cursor-not-allowed opacity-60'
  } else if (heldByOther) {
    stateClasses = 'bg-warning-bg text-warning-ink border-warning-bg cursor-not-allowed'
  } else {
    // available — tinted by category
    stateClasses = cn(
      'bg-transparent text-ink-3 hover:text-ink cursor-pointer',
      categoryBorder(seat.category),
    )
  }

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onToggle(seat)}
      title={`${seat.row}${seat.number} · ${seatCategoryMeta[seat.category].label}`}
      aria-pressed={selected}
      aria-label={`Seat ${seat.row}${seat.number}, ${seatCategoryMeta[seat.category].label}, ${seat.status.toLowerCase()}`}
      className={cn(base, stateClasses)}
      whileHover={disabled ? undefined : { scale: 1.12 }}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      animate={selected ? { scale: [1, 1.22, 1] } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22, duration: 0.3 }}
    >
      {seat.number}
    </motion.button>
  )
}

/** Available-seat border reflects the category color. */
function categoryBorder(cat: SeatAvailability['category']): string {
  return {
    FRONT_ROW: 'border-seat-front/60 hover:border-seat-front',
    STANDARD: 'border-seat-standard/60 hover:border-seat-standard',
    PREMIUM: 'border-seat-premium/60 hover:border-seat-premium',
    RECLINER: 'border-seat-recliner/60 hover:border-seat-recliner',
  }[cat]
}

function groupRows(seats: SeatAvailability[]): [string, SeatAvailability[]][] {
  const map = new Map<string, SeatAvailability[]>()
  for (const s of seats) {
    const arr = map.get(s.row) ?? []
    arr.push(s)
    map.set(s.row, arr)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([row, list]) => [row, list.sort((a, b) => a.number - b.number)] as [string, SeatAvailability[]])
}
