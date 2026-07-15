/**
 * Shared domain types — hand-mirrored from the backend Prisma schema/validators
 * (backend PLAN §4). Kept in sync manually for now; hoist to a shared
 * @cinebook/types package if this repo becomes a monorepo workspace.
 */

export type Role = 'CUSTOMER' | 'HALL_MANAGER' | 'ADMIN'
export type AgeRating = 'U' | 'UA' | 'A'
export type Format = 'TWO_D' | 'THREE_D'
export type ScreenType = 'STANDARD' | 'IMAX' | 'FOURDX' | 'DOLBY_ATMOS'
export type SeatCategory = 'FRONT_ROW' | 'STANDARD' | 'PREMIUM' | 'RECLINER'
export type ShowStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED'
export type PaymentStatus = 'INITIATED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'
export type HoldStatus = 'ACTIVE' | 'CONVERTED' | 'RELEASED' | 'EXPIRED'

export interface User {
  id: string
  phone: string
  name: string | null
  email: string | null
  role: Role
  isActive: boolean
  preferences?: Record<string, unknown> | null
}

export interface CastMember {
  name: string
  role: string
  photoUrl?: string
}

export interface Movie {
  id: string
  title: string
  description: string
  runtimeMin: number
  releaseDate: string
  language: string
  ageRating: AgeRating
  posterUrl: string | null
  trailerUrl: string | null
  cast: CastMember[]
  isTrending: boolean
  genres: string[]
}

export interface Theatre {
  id: string
  chain: string
  name: string
  city: string
  address: string
}

export interface Screen {
  id: string
  theatreId: string
  name: string
  screenType: ScreenType
  equipment: string[]
}

export interface Seat {
  id: string
  row: string
  number: number
  category: SeatCategory
}

/** A seat plus its live status for the seat-map render. */
export interface SeatWithStatus extends Seat {
  status: 'available' | 'held' | 'booked'
  price: number // paise, = show.basePrice × category multiplier
}

export interface Show {
  id: string
  movieId: string
  screenId: string
  startsAt: string
  endsAt: string
  format: Format
  basePrice: number
  status: ShowStatus
}

export interface Booking {
  id: string
  code: string
  userId: string
  showId: string
  status: BookingStatus
  subtotal: number
  discount: number
  total: number
  promoCode: string | null
  createdAt: string
}

export interface Payment {
  id: string
  bookingId: string
  amount: number
  status: PaymentStatus
  transactionId: string
  cardLast4: string | null
  failureReason: string | null
}

export interface SeatHold {
  id: string
  showId: string
  seatIds: string[]
  status: HoldStatus
  expiresAt: string
}

export interface MovieFilters {
  releaseFrom?: string
  releaseTo?: string
  genre?: string
  chain?: string
  screenType?: ScreenType
  format?: Format
  language?: string
  ageRating?: AgeRating
  q?: string
}
