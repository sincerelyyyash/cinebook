'use client'

import { useEffect, useState } from 'react'
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react/ssr'
import { PageHeader } from '@/components/shell/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/admin/data-table'
import { useToast } from '@/components/providers/toast-provider'
import { api, ApiError } from '@/lib/api/client'
import { createMovie, updateMovie } from '@/lib/api/admin'
import { formatDate, formatRuntime } from '@/lib/format/datetime'
import { cn } from '@/lib/design/cn'
import type { Paginated, MovieSummary, MovieDetail, Genre, CastMember } from '@/lib/api/dto'
import type { AgeRating } from '@/lib/types'

const RATINGS: AgeRating[] = ['U', 'UA', 'A']

type FormTarget = 'new' | MovieSummary | null

export function CatalogView() {
  const [rows, setRows] = useState<MovieSummary[] | null>(null)
  const [genres, setGenres] = useState<Genre[]>([])
  const [target, setTarget] = useState<FormTarget>(null)

  async function load() {
    setRows(null)
    try {
      const res = await api.get<Paginated<MovieSummary>>('/movies?pageSize=100&sort=title&order=asc')
      setRows(res.data)
    } catch {
      setRows([])
    }
  }
  useEffect(() => {
    void load()
    void api.get<Genre[]>('/genres').then(setGenres).catch(() => setGenres([]))
  }, [])

  return (
    <>
      <PageHeader
        title="Movie Catalog"
        description="Add and update movies"
        actions={
          <Button size="sm" variant="accent" onClick={() => setTarget('new')}>
            <Plus size={15} /> New movie
          </Button>
        }
      />
      <div className="p-6">
        <DataTable
          rowKey={(m: MovieSummary) => m.id}
          rows={rows}
          empty="No movies yet."
          columns={[
            { key: 'title', header: 'Title', render: (m) => <span className="text-ink font-medium">{m.title}</span> },
            { key: 'genres', header: 'Genres', render: (m) => <span className="text-ink-3 text-xs">{m.genres.join(', ')}</span> },
            { key: 'lang', header: 'Language', render: (m) => <span className="text-ink-2">{m.language}</span> },
            { key: 'runtime', header: 'Runtime', render: (m) => <span className="text-ink-3 text-xs">{formatRuntime(m.runtimeMin)}</span> },
            { key: 'rating', header: 'Rating', render: (m) => <Badge variant="neutral" size="xs">{m.ageRating}</Badge> },
            { key: 'release', header: 'Release', render: (m) => <span className="text-ink-3 text-xs">{formatDate(m.releaseDate)}</span> },
            { key: 'trend', header: '', render: (m) => (m.isTrending ? <Badge variant="accent" size="xs">Trending</Badge> : null) },
            {
              key: 'edit',
              header: '',
              align: 'right',
              render: (m) => (
                <button
                  onClick={() => setTarget(m)}
                  className="interactive h-7 w-7 rounded-md border border-line-2 inline-flex items-center justify-center text-ink-2 hover:text-ink"
                  aria-label="Edit movie"
                >
                  <PencilSimple size={13} />
                </button>
              ),
            },
          ]}
        />
      </div>

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target === 'new' ? 'Add movie' : 'Edit movie'}
        className="max-w-lg"
      >
        {target !== null && (
          <MovieForm
            key={target === 'new' ? 'new' : target.id}
            movie={target === 'new' ? null : target}
            genres={genres}
            onClose={() => setTarget(null)}
            onSaved={load}
          />
        )}
      </Modal>
    </>
  )
}

function MovieForm({
  movie,
  genres,
  onClose,
  onSaved,
}: {
  movie: MovieSummary | null
  genres: Genre[]
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const editing = !!movie

  const [loading, setLoading] = useState(editing)
  const [title, setTitle] = useState(movie?.title ?? '')
  const [description, setDescription] = useState('')
  const [runtimeMin, setRuntimeMin] = useState(movie ? String(movie.runtimeMin) : '120')
  const [releaseDate, setReleaseDate] = useState(
    movie ? movie.releaseDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  )
  const [language, setLanguage] = useState(movie?.language ?? 'English')
  const [ageRating, setAgeRating] = useState<AgeRating>(movie?.ageRating ?? 'UA')
  const [posterUrl, setPosterUrl] = useState(movie?.posterUrl ?? '')
  const [trailerUrl, setTrailerUrl] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(movie?.genres ?? []))
  const [cast, setCast] = useState<CastMember[]>([])
  const [isTrending, setIsTrending] = useState(movie?.isTrending ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // In edit mode, load the fields the list doesn't carry (description, cast, trailer).
  useEffect(() => {
    if (!movie) return
    let on = true
    void api
      .get<MovieDetail>(`/movies/${movie.id}`)
      .then((d) => {
        if (!on) return
        setDescription(d.description)
        setTrailerUrl(d.trailerUrl ?? '')
        setCast(d.cast ?? [])
        setSelected(new Set(d.genres))
      })
      .catch(() => setError('Could not load this movie’s details.'))
      .finally(() => on && setLoading(false))
    return () => {
      on = false
    }
  }, [movie])

  function toggleGenre(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }
  function addCast() {
    setCast((prev) => [...prev, { name: '', role: '' }])
  }
  function updateCast(i: number, patch: Partial<CastMember>) {
    setCast((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }
  function removeCast(i: number) {
    setCast((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (selected.size === 0) {
      setError('Pick at least one genre.')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      title: title.trim(),
      description: description.trim(),
      runtimeMin: Number(runtimeMin),
      releaseDate: new Date(releaseDate).toISOString(),
      language: language.trim(),
      ageRating,
      posterUrl: posterUrl.trim() || undefined,
      trailerUrl: trailerUrl.trim() || undefined,
      genres: [...selected],
      cast: cast.filter((c) => c.name.trim() && c.role.trim()),
      isTrending,
    }
    try {
      if (editing) await updateMovie(movie!.id, payload)
      else await createMovie(payload)
      toast.success(editing ? 'Movie updated' : 'Movie added')
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save movie.')
      setSaving(false)
    }
  }

  if (loading) return <div className="h-64 skeleton rounded-lg" />

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <div className="rounded-lg status-danger p-2.5 text-xs">{error}</div>}
      <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
      <Field label="Description"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Runtime (min)"><Input type="number" min={1} value={runtimeMin} onChange={(e) => setRuntimeMin(e.target.value)} required /></Field>
        <Field label="Language"><Input value={language} onChange={(e) => setLanguage(e.target.value)} required /></Field>
        <Field label="Rating">
          <Select value={ageRating} onChange={(e) => setAgeRating(e.target.value as AgeRating)}>
            {RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Release date"><Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Poster URL (optional)"><Input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="https://…" /></Field>
        <Field label="Trailer URL (optional)"><Input value={trailerUrl} onChange={(e) => setTrailerUrl(e.target.value)} placeholder="https://youtube.com/…" /></Field>
      </div>

      <Field label="Genres">
        <div className="flex flex-wrap gap-1.5">
          {genres.map((g) => (
            <button key={g.id} type="button" onClick={() => toggleGenre(g.name)}
              className={cn('h-7 px-2.5 rounded-md text-xs border transition-colors-fast',
                selected.has(g.name) ? 'bg-accent-bg text-accent border-accent' : 'bg-surface text-ink-2 border-line-2 hover:border-line-strong')}>
              {g.name}
            </button>
          ))}
        </div>
      </Field>

      {/* Cast editor */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-label">Cast &amp; crew</span>
          <button type="button" onClick={addCast} className="text-xs text-accent hover:underline inline-flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
        {cast.length > 0 && (
          <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto scroll-thin pr-1">
            {cast.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={c.name} onChange={(e) => updateCast(i, { name: e.target.value })} placeholder="Name" className="h-8 flex-1" />
                <Input value={c.role} onChange={(e) => updateCast(i, { role: e.target.value })} placeholder="Role / character" className="h-8 flex-1" />
                <button type="button" onClick={() => removeCast(i)} className="interactive h-8 w-8 rounded-md border border-line-2 flex items-center justify-center text-ink-3 hover:text-danger-ink shrink-0" aria-label="Remove">
                  <Trash size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
        <input type="checkbox" checked={isTrending} onChange={(e) => setIsTrending(e.target.checked)} className="accent-[var(--color-accent)]" />
        Mark as trending
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="accent" loading={saving}>{editing ? 'Save changes' : 'Add movie'}</Button>
      </div>
    </form>
  )
}
