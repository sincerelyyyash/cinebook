'use client'

import { api } from './client'
import type {
  Paginated,
  UserProfile,
  ReportSummary,
  RevenueSeries,
  TopMovie,
  TopTheatre,
  ActivityRow,
  PromoSummary,
  TheatreSummary,
  MovieDetail,
  ScreenInfo,
} from './dto'
import type { Role, AgeRating, Format, ScreenType, SeatCategory } from '@/lib/types'

/** Admin-only operations. All require an ADMIN session (enforced by the backend). */

/* ── Users (§1.4) ──────────────────────────────────────────────────────────── */
export interface ListUsersParams {
  role?: Role
  isActive?: boolean
  search?: string
  page?: number
  pageSize?: number
}
function qs(p: object): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(p) as [string, unknown][]) {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export function listUsers(params: ListUsersParams = {}) {
  return api.get<Paginated<UserProfile>>(`/users${qs(params)}`)
}
export function setUserActive(userId: string, isActive: boolean) {
  return api.patch<UserProfile>(`/users/${userId}/active`, { isActive })
}
export function setUserRole(userId: string, role: Role) {
  return api.patch<UserProfile>(`/users/${userId}/role`, { role })
}

/* ── Reports (§1.4) ────────────────────────────────────────────────────────── */
export function reportSummary(from?: string, to?: string) {
  return api.get<ReportSummary>(`/admin/reports/summary${qs({ from, to })}`)
}
export function revenueSeries(granularity: 'daily' | 'weekly' | 'monthly' = 'daily', from?: string, to?: string) {
  return api.get<RevenueSeries>(`/admin/reports/revenue${qs({ granularity, from, to })}`)
}
export function topMovies(limit = 8) {
  return api.get<TopMovie[]>(`/admin/reports/top-movies${qs({ limit })}`)
}
export function topTheatres(limit = 8) {
  return api.get<TopTheatre[]>(`/admin/reports/top-theatres${qs({ limit })}`)
}

/* ── Activity log (§3.1) ───────────────────────────────────────────────────── */
export interface ActivityParams {
  action?: string
  success?: boolean
  page?: number
  pageSize?: number
}
export function listActivity(params: ActivityParams = {}) {
  return api.get<Paginated<ActivityRow>>(`/admin/activity${qs(params)}`)
}

/* ── Promos ────────────────────────────────────────────────────────────────── */
export interface CreatePromoInput {
  code: string
  description: string
  percentOff?: number
  flatOff?: number
  maxDiscount?: number
  minAmount?: number
  validFrom: string
  validTo: string
  usageLimit?: number
}
export function listAllPromos() {
  return api.get<PromoSummary[]>('/promos')
}
export function createPromo(input: CreatePromoInput) {
  return api.post<PromoSummary>('/promos', input)
}

/* ── Theatres ──────────────────────────────────────────────────────────────── */
export interface CreateTheatreInput {
  chain: string
  name: string
  city: string
  address: string
  lat?: number
  lng?: number
}
export function createTheatre(input: CreateTheatreInput) {
  return api.post<TheatreSummary>('/theatres', input)
}

/* ── Movies ────────────────────────────────────────────────────────────────── */
export interface CreateMovieInput {
  title: string
  description: string
  runtimeMin: number
  releaseDate: string
  language: string
  ageRating: AgeRating
  posterUrl?: string
  trailerUrl?: string
  cast?: { name: string; role: string; photoUrl?: string }[]
  genres: string[]
  isTrending?: boolean
}
export function createMovie(input: CreateMovieInput) {
  return api.post<MovieDetail>('/movies', input)
}
export function updateMovie(id: string, input: Partial<CreateMovieInput>) {
  return api.patch<MovieDetail>(`/movies/${id}`, input)
}

/* ── Screens (seat-layout generator) ───────────────────────────────────────── */
export interface LayoutRow {
  row: string
  seats: number
  category: SeatCategory
}
export interface CreateScreenInput {
  theatreId: string
  name: string
  screenType: ScreenType
  equipment?: string[]
  managerId?: string
  layout: { rows: LayoutRow[] }
}
export function createScreen(input: CreateScreenInput) {
  return api.post<ScreenInfo>('/screens', input)
}

export type { Format }
