import Link from 'next/link'
import { FilmSlate, Star } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'
import { Badge } from '@/components/ui/badge'
import { formatRuntime } from '@/lib/format/datetime'
import type { MovieSummary } from '@/lib/api/dto'

/** Movie tile for the storefront grid and rails. Links to the detail page. */
export function MovieCard({ movie, className }: { movie: MovieSummary; className?: string }) {
  return (
    <Link
      href={`/movies/${movie.id}`}
      className={cn(
        'group flex flex-col rounded-xl overflow-hidden bg-surface border border-line-2 elevated-xs',
        'transition-transform-fast hover:-translate-y-0.5 hover:border-line-strong',
        className,
      )}
    >
      <div className="relative aspect-[2/3] bg-raised overflow-hidden">
        {movie.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-raised to-canvas text-ink-dim">
            <FilmSlate size={28} />
            <span className="text-2xs uppercase tracking-widest">No poster</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <Badge variant="neutral" size="xs">{movie.ageRating}</Badge>
          {movie.isTrending && <Badge variant="accent" size="xs">Trending</Badge>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        <h3 className="text-sm font-medium text-ink line-clamp-1" title={movie.title}>
          {movie.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <span>{movie.language}</span>
          <span className="text-ink-dim">·</span>
          <span>{formatRuntime(movie.runtimeMin)}</span>
          {movie.rating.count > 0 && (
            <>
              <span className="text-ink-dim">·</span>
              <span className="inline-flex items-center gap-0.5 text-warning-ink">
                <Star size={11} weight="fill" />
                {movie.rating.average.toFixed(1)}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {movie.genres.slice(0, 2).map((g) => (
            <span key={g} className="text-2xs text-ink-3 bg-hover rounded px-1.5 py-0.5">
              {g}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
