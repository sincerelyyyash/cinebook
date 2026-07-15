import { FilmStrip } from '@phosphor-icons/react/ssr'
import { listMovies, listGenres, getTrending } from '@/lib/api/catalog'
import { MovieCard } from '@/components/movies/movie-card'
import { FilterBar } from '@/components/movies/filter-bar'
import { Reveal } from '@/components/ui/reveal'
import { EmptyState } from '@/components/ui/feedback'
import type { MovieFilters } from '@/lib/types'
import type { ScreenType, Format, AgeRating } from '@/lib/types'

export const metadata = { title: 'Movies' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

/**
 * Customer storefront — browse movies. Server-rendered from GET /movies with
 * URL-driven filters (§1.2); genres + trending rail load in parallel.
 */
export default async function MoviesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const filters: MovieFilters = {
    q: one(sp.search),
    genre: one(sp.genre),
    chain: one(sp.chain),
    screenType: one(sp.screenType) as ScreenType | undefined,
    format: one(sp.format) as Format | undefined,
    ageRating: one(sp.ageRating) as AgeRating | undefined,
    language: one(sp.language),
    releaseFrom: one(sp.releaseFrom),
    releaseTo: one(sp.releaseTo),
  }
  const page = Number(one(sp.page) ?? '1')

  const [movies, genres, trending, allForLangs] = await Promise.all([
    listMovies({ ...filters, page, pageSize: 18 }),
    listGenres(),
    getTrending().catch(() => []),
    listMovies({ pageSize: 100 }).catch(() => null),
  ])

  const languages = Array.from(
    new Set((allForLangs?.data ?? movies.data).map((m) => m.language)),
  ).sort()

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-semibold text-ink">Now Showing</h1>
        <p className="text-sm text-ink-2">Browse and book across every theatre.</p>
      </div>

      {trending.length > 0 && !hasFilters && (
        <section className="flex flex-col gap-3">
          <h2 className="text-label">Trending now</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {trending.slice(0, 6).map((m, i) => (
              <Reveal key={m.id} index={i}>
                <MovieCard movie={m} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <FilterBar genres={genres} languages={languages} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-label">
            {hasFilters ? 'Results' : 'All movies'} · {movies.pagination.total}
          </h2>
        </div>

        {movies.data.length === 0 ? (
          <div className="rounded-xl border border-line-2 bg-surface">
            <EmptyState
              icon={FilmStrip}
              title="No movies match these filters"
              description="Try clearing a filter or searching for something else."
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {movies.data.map((m, i) => (
              <Reveal key={m.id} index={i}>
                <MovieCard movie={m} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
