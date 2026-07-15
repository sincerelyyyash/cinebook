import 'server-only'
import { serverFetch } from './server'
import type {
  Paginated,
  MovieSummary,
  MovieDetail,
  Review,
  Genre,
  ShowSummary,
  ShowtimesResponse,
  ShowDetail,
  TheatreSummary,
  CastMember,
  ScreenBrief,
  ScreenInfo,
} from './dto'
import type { MovieFilters } from '@/lib/types'

/** Build a query string, dropping empty values. */
function qs(params: object): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params) as [string, unknown][]) {
    if (v !== undefined && v !== '' && v !== null) sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

/* ── Movies ────────────────────────────────────────────────────────────────── */

export interface ListMoviesParams extends MovieFilters {
  page?: number
  pageSize?: number
  sort?: 'releaseDate' | 'title'
  order?: 'asc' | 'desc'
}

export function listMovies(params: ListMoviesParams = {}) {
  const query = qs({
    page: params.page,
    pageSize: params.pageSize,
    search: params.q,
    genre: params.genre,
    language: params.language,
    ageRating: params.ageRating,
    chain: params.chain,
    screenType: params.screenType,
    format: params.format,
    releaseDateFrom: params.releaseFrom,
    releaseDateTo: params.releaseTo,
    sort: params.sort,
    order: params.order,
  })
  return serverFetch<Paginated<MovieSummary>>(`/movies${query}`, { auth: false })
}

export function getMovie(id: string) {
  return serverFetch<MovieDetail>(`/movies/${id}`, { auth: false })
}

export function getCast(id: string) {
  return serverFetch<CastMember[]>(`/movies/${id}/cast`, { auth: false })
}

export function getSimilar(id: string) {
  return serverFetch<MovieSummary[]>(`/movies/${id}/similar`, { auth: false })
}

export function getTrending() {
  return serverFetch<MovieSummary[]>(`/movies/trending`, { auth: false })
}

export function getUpcoming() {
  return serverFetch<Paginated<MovieSummary>>(`/movies/upcoming`, { auth: false })
}

export function listReviews(id: string) {
  return serverFetch<Paginated<Review>>(`/movies/${id}/reviews`, { auth: false })
}

/* ── Genres ────────────────────────────────────────────────────────────────── */

export function listGenres() {
  return serverFetch<Genre[]>(`/genres`, { auth: false })
}

/* ── Shows ─────────────────────────────────────────────────────────────────── */

export interface ListShowsParams {
  movieId?: string
  screenId?: string
  theatreId?: string
  city?: string
  chain?: string
  screenType?: string
  format?: string
  date?: string
  page?: number
  pageSize?: number
}

export function listShows(params: ListShowsParams = {}) {
  return serverFetch<Paginated<ShowSummary>>(`/shows${qs(params)}`, { auth: false })
}

export function getShowtimes(movieId: string, params: Omit<ListShowsParams, 'movieId'> = {}) {
  return serverFetch<ShowtimesResponse>(
    `/shows/showtimes${qs({ movieId, ...params })}`,
    { auth: false },
  )
}

export function getShow(id: string) {
  return serverFetch<ShowDetail>(`/shows/${id}`, { auth: false })
}

/* ── Theatres ──────────────────────────────────────────────────────────────── */

export function listTheatres(params: { city?: string; chain?: string; pageSize?: number } = {}) {
  return serverFetch<Paginated<TheatreSummary>>(
    `/theatres${qs({ pageSize: 100, ...params })}`,
    { auth: false },
  )
}

export function listTheatreScreens(theatreId: string) {
  return serverFetch<ScreenBrief[]>(`/theatres/${theatreId}/screens`, { auth: false })
}

export function getScreen(screenId: string) {
  return serverFetch<ScreenInfo>(`/screens/${screenId}`, { auth: false })
}

/* ── Manager: discover the screens a manager owns ───────────────────────────── */

/**
 * Enumerate every screen's full detail. The backend has no flat screens list,
 * so we walk theatres → screens → screen detail (which carries `manager`).
 * Fine at seed scale; revisit if the venue count grows large.
 */
export async function getAllScreens(): Promise<ScreenInfo[]> {
  const theatres = await listTheatres()
  const screenLists = await Promise.all(
    theatres.data.map((t) => listTheatreScreens(t.id).catch(() => [] as ScreenBrief[])),
  )
  const ids = screenLists.flat().map((s) => s.id)
  const details = await Promise.all(ids.map((id) => getScreen(id).catch(() => null)))
  return details.filter((s): s is ScreenInfo => s !== null)
}

/** Screens assigned to a manager (admins use getAllScreens for override powers). */
export async function getManagedScreens(userId: string): Promise<ScreenInfo[]> {
  const all = await getAllScreens()
  return all.filter((s) => s.manager?.id === userId)
}
