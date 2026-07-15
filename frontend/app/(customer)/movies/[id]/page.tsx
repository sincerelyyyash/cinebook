import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, Clock, FilmSlate, Globe, Star } from '@phosphor-icons/react/ssr'
import { getMovie, getShowtimes } from '@/lib/api/catalog'
import { ApiError } from '@/lib/api/client'
import { Badge } from '@/components/ui/badge'
import { Money } from '@/components/ui/money'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/feedback'
import { ShowtimeFilters } from '@/components/movies/showtime-filters'
import { TrailerButton } from '@/components/movies/trailer-button'
import { Reveal } from '@/components/ui/reveal'
import { formatRuntime, formatDate, formatTime } from '@/lib/format/datetime'
import type { ScreenType } from '@/lib/types'

type Params = Promise<{ id: string }>
type Search = Promise<Record<string, string | string[] | undefined>>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

const FORMAT_LABEL: Record<string, string> = { TWO_D: '2D', THREE_D: '3D' }
const SCREEN_LABEL: Record<string, string> = {
  STANDARD: 'Standard',
  IMAX: 'IMAX',
  FOURDX: '4DX',
  DOLBY_ATMOS: 'Dolby Atmos',
}

export async function generateMetadata({ params }: { params: Params }) {
  try {
    const movie = await getMovie((await params).id)
    return { title: movie.title }
  } catch {
    return { title: 'Movie' }
  }
}

export default async function MovieDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}) {
  const { id } = await params
  const sp = await searchParams

  let movie
  try {
    movie = await getMovie(id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  const showtimesRes = await getShowtimes(id, {
    date: one(sp.date),
    chain: one(sp.chain),
    screenType: one(sp.screenType) as ScreenType | undefined,
  }).catch(() => null)
  const theatres = showtimesRes?.theatres ?? []
  const showtimesFiltered = Boolean(sp.date || sp.chain || sp.screenType)

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-40 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-raised border border-line-2">
          {movie.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={movie.posterUrl} alt={movie.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-ink-dim">
              <FilmSlate size={32} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{movie.ageRating}</Badge>
            {movie.isTrending && <Badge variant="accent">Trending</Badge>}
            {movie.genres.map((g) => (
              <Badge key={g} variant="neutral">{g}</Badge>
            ))}
          </div>
          <h1 className="font-display text-4xl font-semibold text-ink">{movie.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-2">
            <span className="inline-flex items-center gap-1.5"><Clock size={14} />{formatRuntime(movie.runtimeMin)}</span>
            <span className="inline-flex items-center gap-1.5"><Globe size={14} />{movie.language}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar size={14} />{formatDate(movie.releaseDate)}</span>
            {movie.rating.count > 0 && (
              <span className="inline-flex items-center gap-1 text-warning-ink">
                <Star size={14} weight="fill" />
                {movie.rating.average.toFixed(1)} ({movie.rating.count})
              </span>
            )}
          </div>
          <p className="text-sm text-ink-2 leading-relaxed max-w-2xl">{movie.description}</p>
          {movie.trailerUrl && (
            <div className="pt-1">
              <TrailerButton url={movie.trailerUrl} title={movie.title} />
            </div>
          )}
        </div>
      </div>

      {/* Cast */}
      {movie.cast.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-label">Cast & crew</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {movie.cast.slice(0, 8).map((c, i) => (
              <Reveal key={`${c.name}-${i}`} index={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface border border-line-2">
                <Avatar name={c.name} src={c.photoUrl} size="md" />
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">{c.name}</p>
                  <p className="text-xs text-ink-3 truncate">{c.role}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Showtimes */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          <h2 className="text-label">Showtimes</h2>
          <ShowtimeFilters />
        </div>
        {theatres.length === 0 ? (
          <div className="rounded-xl border border-line-2 bg-surface">
            <EmptyState
              icon={Calendar}
              title={showtimesFiltered ? 'No shows match these filters' : 'No shows scheduled'}
              description={showtimesFiltered ? 'Try a different date, chain, or screen type.' : 'Check back soon. New showtimes are added regularly.'}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {theatres.map((theatre, ti) => (
              <Reveal key={theatre.theatreId} index={ti} className="rounded-xl border border-line-2 bg-surface p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{theatre.theatreName}</p>
                    <p className="text-xs text-ink-3">{theatre.chain} · {theatre.city}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {theatre.dates.map((d) => (
                    <div key={d.date} className="flex flex-col gap-1.5">
                      <p className="text-xs text-ink-2">{formatDate(d.date)}</p>
                      <div className="flex flex-wrap gap-2">
                        {d.shows.map((s) => (
                          <Link
                            key={s.showId}
                            href={`/shows/${s.showId}/seats`}
                            className="group inline-flex flex-col items-start gap-0.5 rounded-lg border border-line-2 bg-field px-3 py-2 hover:border-accent transition-colors-fast"
                          >
                            <span className="text-sm font-medium text-ink group-hover:text-accent">{formatTime(s.startsAt)}</span>
                            <span className="text-2xs text-ink-3">
                              {SCREEN_LABEL[s.screenType] ?? s.screenType} · {FORMAT_LABEL[s.format] ?? s.format} · <Money paise={s.basePrice} />
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
