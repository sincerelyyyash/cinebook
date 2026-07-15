'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Genre } from '@/lib/api/dto'

const SCREEN_TYPES = ['STANDARD', 'IMAX', 'FOURDX', 'DOLBY_ATMOS'] as const
const FORMATS = ['TWO_D', 'THREE_D'] as const
const AGE_RATINGS = ['U', 'UA', 'A'] as const
const CHAINS = ['PVR', 'INOX', 'Cinepolis'] as const

const LABELS: Record<string, string> = {
  TWO_D: '2D',
  THREE_D: '3D',
  FOURDX: '4DX',
  DOLBY_ATMOS: 'Dolby Atmos',
  STANDARD: 'Standard',
  IMAX: 'IMAX',
}

/**
 * Movie filter bar. Filters live in the URL (?genre=…&chain=…) so they're
 * shareable and the RSC page re-renders from the server on change. Maps 1:1 to
 * GET /movies query params (assignment §1.2).
 */
export function FilterBar({ genres, languages }: { genres: Genre[]; languages: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString())
      if (value === null || value === '' || next.get(key) === value) next.delete(key)
      else next.set(key, value)
      next.delete('page')
      startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
    },
    [params, pathname, router],
  )

  const active = (key: string, value: string) => params.get(key) === value
  const hasFilters = Array.from(params.keys()).some((k) => k !== 'page')

  return (
    <div className={cn('flex flex-col gap-3', pending && 'opacity-70 transition-base')}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input
            placeholder="MagnifyingGlass movies…"
            className="pl-9"
            defaultValue={params.get('search') ?? ''}
            onChange={(e) => setParam('search', e.target.value || null)}
          />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-widest text-ink-dim">Language</span>
          <Select
            value={params.get('language') ?? ''}
            onChange={(e) => setParam('language', e.target.value || null)}
            className="w-40"
          >
            <option value="">Any language</option>
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-widest text-ink-dim">Released from</span>
          <Input
            type="date"
            className="w-40"
            value={params.get('releaseFrom') ?? ''}
            onChange={(e) => setParam('releaseFrom', e.target.value || null)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-widest text-ink-dim">Released to</span>
          <Input
            type="date"
            className="w-40"
            value={params.get('releaseTo') ?? ''}
            onChange={(e) => setParam('releaseTo', e.target.value || null)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <FilterGroup label="Genre">
          {genres.filter((g) => g.movieCount > 0).map((g) => (
            <Chip key={g.id} on={active('genre', g.name)} onClick={() => setParam('genre', g.name)}>
              {g.name}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Chain">
          {CHAINS.map((c) => (
            <Chip key={c} on={active('chain', c)} onClick={() => setParam('chain', c)}>
              {c}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Screen">
          {SCREEN_TYPES.map((s) => (
            <Chip key={s} on={active('screenType', s)} onClick={() => setParam('screenType', s)}>
              {LABELS[s] ?? s}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Format">
          {FORMATS.map((f) => (
            <Chip key={f} on={active('format', f)} onClick={() => setParam('format', f)}>
              {LABELS[f]}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Rating">
          {AGE_RATINGS.map((r) => (
            <Chip key={r} on={active('ageRating', r)} onClick={() => setParam('ageRating', r)}>
              {r}
            </Chip>
          ))}
        </FilterGroup>

        {hasFilters && (
          <button
            onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
            className="interactive inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink rounded-md px-2 py-1"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-2xs uppercase tracking-widest text-ink-dim">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-6 px-2 rounded-md text-xs border transition-colors-fast',
        on
          ? 'bg-accent-bg text-accent border-accent'
          : 'bg-surface text-ink-2 border-line-2 hover:border-line-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
