'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/design/cn'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

const CHAINS = ['PVR', 'INOX', 'Cinepolis']
const SCREEN_TYPES = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'IMAX', label: 'IMAX' },
  { value: 'FOURDX', label: '4DX' },
  { value: 'DOLBY_ATMOS', label: 'Dolby Atmos' },
]

/**
 * Showtime filters for the movie-detail page (assignment 1.2 "Choose a Show —
 * filter by date, location, and screen type"). URL-driven so the RSC re-fetches
 * grouped showtimes from GET /shows/showtimes with the chosen params.
 */
export function ShowtimeFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
  }

  const hasFilters = ['date', 'chain', 'screenType'].some((k) => params.get(k))

  return (
    <div className={cn('flex flex-wrap items-end gap-3', pending && 'opacity-70 transition-base')}>
      <label className="flex flex-col gap-1">
        <span className="text-2xs uppercase tracking-widest text-ink-dim">Date</span>
        <Input type="date" className="w-40" value={params.get('date') ?? ''} onChange={(e) => setParam('date', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-2xs uppercase tracking-widest text-ink-dim">Chain</span>
        <Select className="w-36" value={params.get('chain') ?? ''} onChange={(e) => setParam('chain', e.target.value)}>
          <option value="">Any chain</option>
          {CHAINS.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-2xs uppercase tracking-widest text-ink-dim">Screen type</span>
        <Select className="w-40" value={params.get('screenType') ?? ''} onChange={(e) => setParam('screenType', e.target.value)}>
          <option value="">Any screen</option>
          {SCREEN_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </label>
      {hasFilters && (
        <button
          onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
          className="interactive h-9 px-3 rounded-md text-xs text-ink-3 hover:text-ink border border-line-2"
        >
          Clear
        </button>
      )}
    </div>
  )
}
