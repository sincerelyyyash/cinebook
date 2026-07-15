/**
 * API DTOs — mirror the backend's response types (src/types/*.ts). Dates arrive
 * as ISO strings over the wire, so every `Date` in the backend types is `string`
 * here. Kept in sync by hand; hoist to a shared package if this becomes a
 * monorepo workspace.
 */
import type {
  AgeRating,
  Format,
  ScreenType,
  SeatCategory,
  ShowStatus,
  BookingStatus,
  Role,
} from '@/lib/types'

/** Backend pagination envelope (inner — the outer `{ data }` is unwrapped). */
export interface Paginated<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

/* ── Movies ────────────────────────────────────────────────────────────────── */
export interface CastMember {
  name: string
  role: string
  photoUrl?: string
}

export interface MovieSummary {
  id: string
  title: string
  runtimeMin: number
  releaseDate: string
  language: string
  ageRating: AgeRating
  posterUrl: string | null
  genres: string[]
  isTrending: boolean
  rating: { average: number; count: number }
}

export interface MovieDetail extends MovieSummary {
  description: string
  trailerUrl: string | null
  cast: CastMember[]
}

export interface Review {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: string
}

export interface Genre {
  id: string
  name: string
  movieCount: number
}

/* ── Shows ─────────────────────────────────────────────────────────────────── */
export interface ShowSummary {
  id: string
  movieId: string
  movieTitle: string
  screenId: string
  screenName: string
  screenType: ScreenType
  theatreId: string
  theatreName: string
  theatreChain: string
  city: string
  startsAt: string
  endsAt: string
  format: Format
  basePrice: number
  status: ShowStatus
}

export interface ShowDetail extends ShowSummary {
  runtimeMin: number
  priceByCategory: Record<SeatCategory, number>
}

export interface ShowtimeShow {
  showId: string
  startsAt: string
  endsAt: string
  format: Format
  screenId: string
  screenName: string
  screenType: ScreenType
  basePrice: number
}
export interface ShowtimeDateGroup {
  date: string
  shows: ShowtimeShow[]
}
export interface ShowtimeTheatreGroup {
  theatreId: string
  theatreName: string
  chain: string
  city: string
  dates: ShowtimeDateGroup[]
}

/** GET /shows/showtimes response — theatres grouped under the movie. */
export interface ShowtimesResponse {
  movieId: string
  movieTitle: string
  theatres: ShowtimeTheatreGroup[]
}

/* ── Venue ─────────────────────────────────────────────────────────────────── */
export interface TheatreSummary {
  id: string
  chain: string
  name: string
  city: string
  address: string
  location: { lat: number; lng: number } | null
  screenCount: number
}

export interface ScreenBrief {
  id: string
  name: string
  screenType: ScreenType
  seatingCapacity: number
}

export interface ScreenInfo {
  id: string
  name: string
  screenType: ScreenType
  equipment: string[]
  theatre: { id: string; chain: string; name: string; city: string }
  manager: { id: string; name: string } | null
  seatingCapacity: number
  seatsByCategory: Record<SeatCategory, number>
  seatMap: { id: string; row: string; number: number; category: SeatCategory }[]
}

/* ── Booking / seats ───────────────────────────────────────────────────────── */
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED'

export interface SeatAvailability {
  id: string
  row: string
  number: number
  category: SeatCategory
  price: number
  status: SeatStatus
  heldByMe: boolean
}

export interface ShowAvailability {
  showId: string
  movieTitle: string
  screenName: string
  theatreName: string
  startsAt: string
  format: Format
  priceByCategory: Record<SeatCategory, number>
  summary: { total: number; available: number; held: number; booked: number }
  seats: SeatAvailability[]
}

export interface HoldSeatLine {
  seatId: string
  label: string
  category: SeatCategory
  price: number
}
export interface HoldDto {
  id: string
  showId: string
  seats: HoldSeatLine[]
  subtotal: number
  expiresAt: string
  ttlSeconds: number
}

export interface BookingSeatLine {
  seatId: string
  label: string
  category: SeatCategory
  price: number
}
export interface BookingDto {
  id: string
  code: string
  status: BookingStatus
  show: {
    id: string
    movieTitle: string
    screenName: string
    theatreName: string
    city: string
    startsAt: string
    format: Format
  }
  seats: BookingSeatLine[]
  subtotal: number
  discount: number
  total: number
  promoCode: string | null
  expiresAt: string | null
  createdAt: string
  payment: { status: string; transactionId: string } | null
}

/* ── Payments ──────────────────────────────────────────────────────────────── */
export interface PaymentDto {
  id: string
  status: string
  transactionId: string
  amount: number
  cardLast4: string | null
}

/** confirm/refund return the payment plus the (re-fetched) booking. */
export interface PaymentResult {
  payment: PaymentDto
  booking: BookingDto
}

/* ── Promos ────────────────────────────────────────────────────────────────── */
export interface PromoPreview {
  code: string
  description: string
  discount: number
}

export interface PromoSummary {
  code: string
  description: string
  percentOff: number | null
  flatOff: number | null
  minAmount: number | null
  validFrom: string
  validTo: string
}

/* ── Admin: users ──────────────────────────────────────────────────────────── */
export interface UserProfile {
  id: string
  name: string
  email: string
  phoneNumber: string | null
  role: Role
  isActive: boolean
  preferences: Record<string, unknown> | null
  createdAt: string
}

/* ── Admin: reports ────────────────────────────────────────────────────────── */
export interface ReportSummary {
  confirmedBookings: number
  pendingBookings: number
  cancelledBookings: number
  refundedBookings: number
  seatsSold: number
  grossRevenue: number
  refundedAmount: number
  netRevenue: number
}

export interface RevenuePoint {
  period: string
  bookings: number
  revenue: number
}

export interface RevenueSeries {
  granularity: 'daily' | 'weekly' | 'monthly'
  points: RevenuePoint[]
}

export interface TopMovie {
  movieId: string
  title: string
  bookings: number
  revenue: number
}

export interface TopTheatre {
  theatreId: string
  name: string
  chain: string
  bookings: number
  revenue: number
}

/* ── Admin: activity log ───────────────────────────────────────────────────── */
export interface ActivityRow {
  id: string
  traceId: string | null
  actorId: string | null
  actorName: string | null
  actorRole: string | null
  action: string
  target: string | null
  metadata: unknown
  success: boolean
  durationMs: number | null
  createdAt: string
}

/* ── Auth ──────────────────────────────────────────────────────────────────── */
export interface AuthUser {
  id: string
  role: Role
  name: string
  email: string
  phoneNumber: string | null
  isActive: boolean
}
