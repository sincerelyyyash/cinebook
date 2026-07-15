'use client'

import { useEffect, useState } from 'react'
import { MonitorPlay, Plus, Trash } from '@phosphor-icons/react/ssr'
import { PageHeader } from '@/components/shell/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/feedback'
import { useToast } from '@/components/providers/toast-provider'
import { api, ApiError } from '@/lib/api/client'
import { createScreen, listUsers, type LayoutRow } from '@/lib/api/admin'
import { seatCategoryMeta, seatCategoryOrder } from '@/lib/seat'
import { cn } from '@/lib/design/cn'
import type { Paginated, TheatreSummary, ScreenBrief, UserProfile } from '@/lib/api/dto'
import type { ScreenType, SeatCategory } from '@/lib/types'

const SCREEN_TYPES: ScreenType[] = ['STANDARD', 'IMAX', 'FOURDX', 'DOLBY_ATMOS']
const TYPE_LABEL: Record<string, string> = { STANDARD: 'Standard', IMAX: 'IMAX', FOURDX: '4DX', DOLBY_ATMOS: 'Dolby Atmos' }

interface TheatreScreens {
  theatre: TheatreSummary
  screens: ScreenBrief[]
}

export function ScreensView() {
  const [data, setData] = useState<TheatreScreens[] | null>(null)
  const [theatres, setTheatres] = useState<TheatreSummary[]>([])
  const [managers, setManagers] = useState<UserProfile[]>([])
  const [open, setOpen] = useState(false)

  async function load() {
    setData(null)
    try {
      const res = await api.get<Paginated<TheatreSummary>>('/theatres?pageSize=100')
      setTheatres(res.data)
      const withScreens = await Promise.all(
        res.data.map(async (t) => ({
          theatre: t,
          screens: await api.get<ScreenBrief[]>(`/theatres/${t.id}/screens`).catch(() => []),
        })),
      )
      setData(withScreens)
    } catch {
      setData([])
    }
  }

  useEffect(() => {
    void load()
    void listUsers({ role: 'HALL_MANAGER', pageSize: 100 })
      .then((r) => setManagers(r.data))
      .catch(() => setManagers([]))
  }, [])

  return (
    <>
      <PageHeader
        title="Screens"
        description="Screen configuration & seat layouts"
        actions={
          <Button size="sm" variant="accent" onClick={() => setOpen(true)}>
            <Plus size={15} /> New screen
          </Button>
        }
      />
      <div className="p-6 flex flex-col gap-5">
        {data === null ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : data.length === 0 ? (
          <Card><EmptyState icon={MonitorPlay} title="No theatres yet" description="Add a theatre first, then configure its screens." /></Card>
        ) : (
          data.map(({ theatre, screens }) => (
            <div key={theatre.id} className="flex flex-col gap-2">
              <p className="text-label">{theatre.chain} · {theatre.name}</p>
              {screens.length === 0 ? (
                <p className="text-sm text-ink-3 px-1">No screens configured.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {screens.map((s) => (
                    <Card key={s.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink">{s.name}</p>
                        <p className="text-xs text-ink-3">{s.seatingCapacity} seats</p>
                      </div>
                      <Badge variant="neutral" size="xs">{TYPE_LABEL[s.screenType] ?? s.screenType}</Badge>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Configure screen" className="max-w-lg">
        <ScreenForm theatres={theatres} managers={managers} onClose={() => setOpen(false)} onSaved={load} />
      </Modal>
    </>
  )
}

let rowSeed = 0
function nextRowLabel(existing: string[]): string {
  for (let i = 0; i < 40; i++) {
    const label = String.fromCharCode(65 + i)
    if (!existing.includes(label)) return label
  }
  return `R${++rowSeed}`
}

function ScreenForm({
  theatres,
  managers,
  onClose,
  onSaved,
}: {
  theatres: TheatreSummary[]
  managers: UserProfile[]
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [theatreId, setTheatreId] = useState(theatres[0]?.id ?? '')
  const [name, setName] = useState('Screen 1')
  const [screenType, setScreenType] = useState<ScreenType>('STANDARD')
  const [equipment, setEquipment] = useState('')
  const [managerId, setManagerId] = useState('')
  const [rows, setRows] = useState<LayoutRow[]>([
    { row: 'A', seats: 10, category: 'FRONT_ROW' },
    { row: 'B', seats: 12, category: 'STANDARD' },
    { row: 'C', seats: 12, category: 'PREMIUM' },
    { row: 'D', seats: 8, category: 'RECLINER' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const capacity = rows.reduce((sum, r) => sum + (Number(r.seats) || 0), 0)

  function addRow() {
    setRows((prev) => [...prev, { row: nextRowLabel(prev.map((r) => r.row)), seats: 10, category: 'STANDARD' }])
  }
  function updateRow(i: number, patch: Partial<LayoutRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (rows.length === 0) {
      setError('Add at least one row.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createScreen({
        theatreId,
        name: name.trim(),
        screenType,
        equipment: equipment
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        managerId: managerId || undefined,
        layout: { rows: rows.map((r) => ({ row: r.row.toUpperCase(), seats: Number(r.seats), category: r.category })) },
      })
      toast.success(`Screen created with ${capacity} seats`)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create screen.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <div className="rounded-lg status-danger p-2.5 text-xs">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Theatre">
          <Select value={theatreId} onChange={(e) => setTheatreId(e.target.value)} required>
            {theatres.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Screen name"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={screenType} onChange={(e) => setScreenType(e.target.value as ScreenType)}>
            {SCREEN_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </Select>
        </Field>
        <Field label="Manager (optional)">
          <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">Unassigned</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name || m.phoneNumber}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Equipment (optional)" hint="Comma-separated, e.g. DOLBY_ATMOS, 4K, RECLINER">
        <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="DOLBY_ATMOS, 4K" />
      </Field>

      {/* Seat-layout builder */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-label">Seat layout · {capacity} seats</span>
          <button type="button" onClick={addRow} className="text-xs text-accent hover:underline inline-flex items-center gap-1">
            <Plus size={12} /> Add row
          </button>
        </div>
        <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto scroll-thin pr-1">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={cn('h-3 w-3 rounded-sm shrink-0', seatCategoryMeta[r.category].swatch)} />
              <Input value={r.row} onChange={(e) => updateRow(i, { row: e.target.value.toUpperCase().slice(0, 2) })} className="w-14 h-8 text-center font-mono" aria-label="Row label" />
              <Input type="number" min={1} max={50} value={r.seats} onChange={(e) => updateRow(i, { seats: Number(e.target.value) })} className="w-20 h-8" aria-label="Seats" />
              <Select value={r.category} onChange={(e) => updateRow(i, { category: e.target.value as SeatCategory })} className="h-8 text-xs flex-1">
                {seatCategoryOrder.map((c) => <option key={c} value={c}>{seatCategoryMeta[c].label}</option>)}
              </Select>
              <button type="button" onClick={() => removeRow(i)} className="interactive h-8 w-8 rounded-md border border-line-2 flex items-center justify-center text-ink-3 hover:text-danger-ink shrink-0" aria-label="Remove row">
                <Trash size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="accent" loading={saving}>Create screen</Button>
      </div>
    </form>
  )
}
