import type { SeatCategory } from '@/lib/types'

/**
 * Seat-category presentation. Colors come from the --color-seat-* theme tokens
 * (globals.css) so the color-coded seat map re-skins with the rest of the app.
 * Multipliers mirror the backend's constants (basePrice × multiplier).
 */

// Multipliers mirror backend src/config/constants.ts SEAT_CATEGORY_MULTIPLIER.
// The backend is authoritative for price; these are for client-side estimates
// and the legend only.
export const seatCategoryMeta: Record<
  SeatCategory,
  { label: string; swatch: string; multiplier: number }
> = {
  FRONT_ROW: { label: 'Front Row', swatch: 'bg-seat-front', multiplier: 0.8 },
  STANDARD: { label: 'Standard', swatch: 'bg-seat-standard', multiplier: 1.0 },
  PREMIUM: { label: 'Premium', swatch: 'bg-seat-premium', multiplier: 1.4 },
  RECLINER: { label: 'Recliner', swatch: 'bg-seat-recliner', multiplier: 1.8 },
}

export const seatCategoryOrder: SeatCategory[] = ['FRONT_ROW', 'STANDARD', 'PREMIUM', 'RECLINER']

/** Max seats per hold — mirrors backend MAX_SEATS_PER_HOLD. */
export const MAX_SEATS = 10

/** Compute a seat's price in paise from the show base price. */
export function seatPrice(basePrice: number, category: SeatCategory): number {
  return Math.round(basePrice * seatCategoryMeta[category].multiplier)
}
