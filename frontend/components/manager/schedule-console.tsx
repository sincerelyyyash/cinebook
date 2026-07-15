'use client'

import { useMemo, useState } from 'react'
import { Clock, FilmStrip, MonitorPlay, PencilSimple, Plus, Trash } from '@phosphor-icons/react/ssr'
import { PageHeader } from '@/components/shell/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Money } from '@/components/ui/money'
import { Badge, ShowStatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/feedback'
import { Reveal } from '@/components/ui/reveal'
import { ShowForm } from './show-form'
import { useToast } from '@/components/providers/toast-provider'
import { deleteShow, listScreenShows } from '@/lib/api/manager'
import { ApiError } from '@/lib/api/client'
import { formatDate, formatTime, formatDateTime } from '@/lib/format/datetime'
import { cn } from '@/lib/design/cn'
import type { MovieSummary, ScreenInfo, ShowSummary } from '@/lib/api/dto'

const FORMAT_LABEL: Record<string, string> = { TWO_D: '2D', THREE_D: '3D' }

type ShowsByScreen = Record<string, ShowSummary[]>

export function ScheduleConsole({
  screens,
  initialShows,
  movies,
}: {
  screens: ScreenInfo[]
  initialShows: ShowsByScreen
  movies: MovieSummary[]
}) {
  const toast = useToast()
  const [activeId, setActiveId] = useState(screens[0]?.id ?? '')
  const [showsByScreen, setShowsByScreen] = useState<ShowsByScreen>(initialShows)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ShowSummary | null>(null)
  const [deleting, setDeleting] = useState<ShowSummary | null>(null)
  const [busy, setBusy] = useState(false)

  const activeScreen = screens.find((s) => s.id === activeId)
  const shows = showsByScreen[activeId] ?? []

  async function refresh(screenId: string) {
    try {
      const res = await listScreenShows(screenId)
      setShowsByScreen((prev) => ({ ...prev, [screenId]: res.data }))
    } catch {
      /* keep stale on failure */
    }
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(show: ShowSummary) {
    setEditing(show)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteShow(deleting.id)
      toast.success('Show removed')
      setDeleting(null)
      refresh(activeId)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SHOW_RULE_VIOLATION') {
        toast.error('Cannot delete', err.message)
      } else {
        toast.error('Could not delete show', err instanceof ApiError ? err.message : 'Please try again.')
      }
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  const grouped = useMemo(() => groupByDay(shows), [shows])

  if (screens.length === 0) {
    return (
      <>
        <PageHeader title="Schedule" description="Shows for your assigned screens" />
        <div className="p-6">
          <div className="rounded-xl border border-line-2 bg-surface">
            <EmptyState
              icon={MonitorPlay}
              title="No screens assigned to you yet"
              description="An admin needs to assign you one or more screens before you can schedule shows."
            />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Shows for your assigned screens"
        actions={
          <Button size="sm" variant="accent" onClick={openCreate}>
            <Plus size={15} /> New show
          </Button>
        }
      />

      <div className="p-6 flex flex-col gap-5">
        {/* Screen tabs */}
        <div className="flex flex-wrap gap-2">
          {screens.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors-fast',
                s.id === activeId
                  ? 'bg-selected border-line-strong'
                  : 'bg-surface border-line-2 hover:border-line-strong',
              )}
            >
              <span className="text-sm font-medium text-ink">
                {s.theatre.name} · {s.name}
              </span>
              <span className="text-2xs text-ink-3 uppercase tracking-wide">
                {s.screenType.replace('_', ' ')} · {s.seatingCapacity} seats ·{' '}
                {(showsByScreen[s.id] ?? []).length} shows
              </span>
            </button>
          ))}
        </div>

        {/* Shows for the active screen */}
        {shows.length === 0 ? (
          <div className="rounded-xl border border-line-2 bg-surface">
            <EmptyState
              icon={FilmStrip}
              title="No shows scheduled on this screen"
              description="Add a show. The scheduler enforces no-overlap, a 30-minute cleaning gap, and a 30-day window."
              action={
                <Button size="sm" variant="secondary" onClick={openCreate}>
                  <Plus size={14} /> New show
                </Button>
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(([day, dayShows]) => (
              <div key={day} className="flex flex-col gap-2">
                <p className="text-label">{formatDate(day)}</p>
                <div className="flex flex-col gap-1.5">
                  {dayShows.map((show, si) => (
                    <Reveal
                      key={show.id}
                      index={si}
                      className="flex items-center gap-4 rounded-lg border border-line-2 bg-surface px-4 py-3"
                    >
                      <div className="text-center shrink-0 w-16">
                        <p className="text-sm font-medium text-ink">{formatTime(show.startsAt)}</p>
                        <p className="text-2xs text-ink-3">{formatTime(show.endsAt)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{show.movieTitle}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="neutral" size="xs">{FORMAT_LABEL[show.format] ?? show.format}</Badge>
                          <span className="text-xs text-ink-3"><Money paise={show.basePrice} /> base</span>
                          <ShowStatusBadge status={show.status} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(show)}
                          className="interactive h-7 w-7 rounded-md border border-line-2 flex items-center justify-center text-ink-2 hover:text-ink"
                          aria-label="Edit show"
                        >
                          <PencilSimple size={13} />
                        </button>
                        <button
                          onClick={() => setDeleting(show)}
                          className="interactive h-7 w-7 rounded-md border border-line-2 flex items-center justify-center text-ink-2 hover:text-danger-ink"
                          aria-label="Delete show"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit show' : 'Schedule a show'}
      >
        {activeScreen && (
          <ShowForm
            screen={activeScreen}
            movies={movies}
            show={editing ?? undefined}
            onSaved={() => refresh(activeId)}
            onClose={() => setFormOpen(false)}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Remove show?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-2">
            {deleting && (
              <>
                <span className="text-ink font-medium">{deleting.movieTitle}</span> ·{' '}
                {deleting && formatDateTime(deleting.startsAt)}. Shows with existing bookings can’t be
                removed.
              </>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={busy}>
              Keep
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={busy}>
              <Clock size={14} /> Remove show
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function groupByDay(shows: ShowSummary[]): [string, ShowSummary[]][] {
  const sorted = [...shows].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const map = new Map<string, ShowSummary[]>()
  for (const s of sorted) {
    const day = s.startsAt.slice(0, 10)
    const arr = map.get(day) ?? []
    arr.push(s)
    map.set(day, arr)
  }
  return [...map.entries()]
}
