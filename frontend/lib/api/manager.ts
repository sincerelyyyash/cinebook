'use client'

import { api } from './client'
import type { Paginated, ShowSummary } from './dto'
import type { Format } from '@/lib/types'

/**
 * Hall Manager / Admin scheduling mutations. The backend enforces the rule
 * engine (overlap, ≥30-min gap, ≤30-day window, future-only, immutable-if-booked)
 * and screen ownership; failures surface as ApiError with code
 * SHOW_RULE_VIOLATION (details.rule) or FORBIDDEN.
 */

export interface CreateShowInput {
  movieId: string
  screenId: string
  startsAt: string // ISO
  format: Format
  basePrice: number // paise
}

export interface UpdateShowInput {
  startsAt?: string
  format?: Format
  basePrice?: number
}

export function createShow(input: CreateShowInput) {
  return api.post<ShowSummary>('/shows', input)
}

export function updateShow(showId: string, input: UpdateShowInput) {
  return api.patch<ShowSummary>(`/shows/${showId}`, input)
}

export function deleteShow(showId: string) {
  return api.del<void>(`/shows/${showId}`)
}

/** Client-side show listing for a screen (used to refresh after a mutation). */
export function listScreenShows(screenId: string) {
  const from = new Date().toISOString()
  const to = new Date(Date.now() + 31 * 864e5).toISOString()
  return api.get<Paginated<ShowSummary>>(
    `/shows?screenId=${screenId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pageSize=100`,
  )
}
