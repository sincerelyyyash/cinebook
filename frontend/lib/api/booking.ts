'use client'

import { api } from './client'
import type {
  Paginated,
  ShowAvailability,
  HoldDto,
  BookingDto,
  PaymentDto,
  PaymentResult,
  PromoPreview,
  PromoSummary,
} from './dto'

/**
 * Client-side booking API. Holds, bookings, and availability are user actions
 * that mutate/read live state under the customer's hands, so they go through the
 * browser BFF client (not RSC). Availability also streams over WebSocket; this
 * covers the initial read and the polling fallback.
 */

export function getAvailability(showId: string, holdId?: string) {
  const q = holdId ? `?holdId=${encodeURIComponent(holdId)}` : ''
  return api.get<ShowAvailability>(`/shows/${showId}/seats${q}`)
}

/** Place an all-or-nothing 5-minute hold on the selected seats. */
export function holdSeats(showId: string, seatIds: string[]) {
  return api.post<HoldDto>('/bookings/holds', { showId, seatIds })
}

export function releaseHold(holdId: string) {
  return api.del<void>(`/bookings/holds/${holdId}`)
}

/** Convert a hold into a PENDING booking (optionally applying a promo). */
export function createBooking(holdId: string, promoCode?: string) {
  return api.post<BookingDto>('/bookings', { holdId, promoCode })
}

export function confirmBooking(bookingId: string) {
  return api.post<BookingDto>(`/bookings/${bookingId}/confirm`)
}

export function cancelBooking(bookingId: string) {
  return api.post<BookingDto>(`/bookings/${bookingId}/cancel`)
}

export function getBooking(bookingId: string) {
  return api.get<BookingDto>(`/bookings/${bookingId}`)
}

export function listBookings(page = 1, pageSize = 20) {
  return api.get<Paginated<BookingDto>>(`/bookings?page=${page}&pageSize=${pageSize}`)
}

/* ── Promos ────────────────────────────────────────────────────────────────── */

/** Preview a code against an amount (paise) — no mutation. */
export function previewPromo(code: string, amount: number) {
  return api.post<PromoPreview>('/promos/apply', { code, amount })
}

/** Apply a promo to a PENDING booking, recomputing its total. */
export function applyPromo(bookingId: string, code: string) {
  return api.post<BookingDto>(`/bookings/${bookingId}/promo`, { code })
}

export function listPromos() {
  return api.get<PromoSummary[]>('/promos')
}

/* ── Payments (simulated) ──────────────────────────────────────────────────── */

/** Initialize a payment for a PENDING booking. */
export function startPayment(bookingId: string) {
  return api.post<PaymentDto>(`/payments/${bookingId}/start`)
}

/**
 * Confirm payment with a test card. On success the booking is CONFIRMED
 * (payment-gated). Throws ApiError with code PAYMENT_FAILED (declined) or
 * PAYMENT_UNAVAILABLE (circuit open) on failure.
 */
export function confirmPayment(bookingId: string, cardNumber: string) {
  return api.post<PaymentResult>(`/payments/${bookingId}/confirm`, { cardNumber })
}

export function refundPayment(bookingId: string) {
  return api.post<PaymentResult>(`/payments/${bookingId}/refund`)
}
