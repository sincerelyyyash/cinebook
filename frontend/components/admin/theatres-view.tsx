'use client'

import { useEffect, useState } from 'react'
import { Plus } from '@phosphor-icons/react/ssr'
import { PageHeader } from '@/components/shell/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Field, Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/admin/data-table'
import { useToast } from '@/components/providers/toast-provider'
import { api, ApiError } from '@/lib/api/client'
import { createTheatre } from '@/lib/api/admin'
import type { Paginated, TheatreSummary } from '@/lib/api/dto'

export function TheatresView() {
  const [rows, setRows] = useState<TheatreSummary[] | null>(null)
  const [open, setOpen] = useState(false)

  async function load() {
    setRows(null)
    try {
      const res = await api.get<Paginated<TheatreSummary>>('/theatres?pageSize=100')
      setRows(res.data)
    } catch {
      setRows([])
    }
  }
  useEffect(() => {
    void load()
  }, [])

  return (
    <>
      <PageHeader
        title="Theatres"
        description="Chains and locations"
        actions={
          <Button size="sm" variant="accent" onClick={() => setOpen(true)}>
            <Plus size={15} /> New theatre
          </Button>
        }
      />
      <div className="p-6">
        <DataTable
          rowKey={(t: TheatreSummary) => t.id}
          rows={rows}
          empty="No theatres yet."
          columns={[
            { key: 'name', header: 'Theatre', render: (t) => <span className="text-ink font-medium">{t.name}</span> },
            { key: 'chain', header: 'Chain', render: (t) => <Badge variant="neutral">{t.chain}</Badge> },
            { key: 'city', header: 'City', render: (t) => <span className="text-ink-2">{t.city}</span> },
            { key: 'addr', header: 'Address', render: (t) => <span className="text-ink-3 text-xs">{t.address}</span> },
            { key: 'screens', header: 'Screens', align: 'right', render: (t) => t.screenCount },
          ]}
        />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add theatre">
        <TheatreForm onClose={() => setOpen(false)} onSaved={load} />
      </Modal>
    </>
  )
}

function TheatreForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [f, setF] = useState({ chain: '', name: '', city: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createTheatre(f)
      toast.success('Theatre added')
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add theatre.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <div className="rounded-lg status-danger p-2.5 text-xs">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Chain"><Input value={f.chain} onChange={set('chain')} placeholder="PVR" required /></Field>
        <Field label="City"><Input value={f.city} onChange={set('city')} placeholder="Bangalore" required /></Field>
      </div>
      <Field label="Name"><Input value={f.name} onChange={set('name')} placeholder="PVR Orion Mall" required /></Field>
      <Field label="Address"><Input value={f.address} onChange={set('address')} placeholder="Brigade Gateway, Rajajinagar" required /></Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="accent" loading={saving}>Add theatre</Button>
      </div>
    </form>
  )
}
