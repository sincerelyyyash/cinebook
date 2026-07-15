import { FilmSlate } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'

/** CineBook wordmark. Uses the accent token so it re-skins with the theme. */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 select-none', className)}>
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-accent text-accent-ink shrink-0">
        <FilmSlate size={16} />
      </span>
      {!compact && (
        <span className="font-display font-semibold text-ink text-lg tracking-tight">
          Cine<span className="text-accent">Book</span>
        </span>
      )}
    </span>
  )
}
