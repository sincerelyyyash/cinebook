'use client'

import { useState } from 'react'
import { Warning } from '@phosphor-icons/react/ssr'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/providers/toast-provider'
import { createShow, updateShow } from '@/lib/api/manager'
import { ApiError } from '@/lib/api/client'
import type { MovieSummary, ScreenInfo, ShowSummary } from '@/lib/api/dto'
import type { Format } from '@/lib/types'

const FORMATS: { value: Format; label: string }[] = [
  { value: 'TWO_D', label: '2D' },
  { value: 'THREE_D', label: '3D' },
]

/** datetime-local <-> ISO helpers (kept in the browser's local zone). */
function toLocalInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export function ShowForm({
  screen,
  movies,
  show,
  onSaved,
  onClose,
}: {
  screen: ScreenInfo
  movies: MovieSummary[]
  show?: ShowSummary
  onSaved: () => void
  onClose: () => void
}) {
  const toast = useToast()
  const editing = !!show

  const [movieId, setMovieId] = useState(show?.movieId ?? movies[0]?.id ?? '')
  const [startsAt, setStartsAt] = useState(toLocalInput(show?.startsAt))
  const [format, setFormat] = useState<Format>(show?.format ?? 'TWO_D')
  const [rupees, setRupees] = useState(show ? String(show.basePrice / 100) : '250')
  const [violation, setViolation] = useState<{ message: string; rule?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const maxDate = toLocalInput(new Date(Date.now() + 30 * 864e5).toISOString())
  const minDate = toLocalInput(new Date().toISOString())

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setViolation(null)
    setSaving(true)
    const basePrice = Math.round(Number(rupees) * 100)
    const startIso = new Date(startsAt).toISOString()
    try {
      if (editing) {
        await updateShow(show!.id, { startsAt: startIso, format, basePrice })
        toast.success('Show updated')
      } else {
        await createShow({ movieId, screenId: screen.id, startsAt: startIso, format, basePrice })
        toast.success('Show scheduled')
      }
      onSaved()
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SHOW_RULE_VIOLATION') {
        const rule = (err.details as { rule?: string } | undefined)?.rule
        setViolation({ message: err.message, rule })
      } else if (err instanceof ApiError && err.code === 'FORBIDDEN') {
        setViolation({ message: 'You can only schedule shows on your own screens.' })
      } else if (err instanceof ApiError) {
        setViolation({ message: err.message })
      } else {
        toast.error('Could not save show', 'Please try again.')
      }
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {violation && (
        <div className="flex items-start gap-2.5 rounded-lg status-danger p-3">
          <Warning size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Can’t schedule this show</p>
            <p className="text-xs opacity-90">{violation.message}</p>
          </div>
        </div>
      )}

      <div className="text-xs text-ink-3">
        {screen.theatre.chain} {screen.theatre.name} · {screen.name} ({screen.screenType.replace('_', ' ')})
      </div>

      <Field label="Movie">
        {editing ? (
          <Input value={movies.find((m) => m.id === movieId)?.title ?? show!.movieTitle} disabled />
        ) : (
          <Select value={movieId} onChange={(e) => setMovieId(e.target.value)} required>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.runtimeMin}m)
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Starts at" hint="Up to 30 days ahead; must be in the future.">
        <Input
          type="datetime-local"
          value={startsAt}
          min={minDate}
          max={maxDate}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Format">
          <Select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Base price (₹)" hint="₹10–₹2000">
          <Input
            type="number"
            min={10}
            max={2000}
            value={rupees}
            onChange={(e) => setRupees(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" loading={saving}>
          {editing ? 'Save changes' : 'Schedule show'}
        </Button>
      </div>
    </form>
  )
}
