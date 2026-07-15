'use client'

import { useEffect, useState } from 'react'
import { Plus } from '@phosphor-icons/react/ssr'
import { PageHeader } from '@/components/shell/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Field, Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/admin/data-table'
import { Money } from '@/components/ui/money'
import { useToast } from '@/components/providers/toast-provider'
import { listAllPromos, createPromo } from '@/lib/api/admin'
import { ApiError } from '@/lib/api/client'
import { formatDate } from '@/lib/format/datetime'
import type { PromoSummary } from '@/lib/api/dto'

export function PromosView() {
  const [rows, setRows] = useState<PromoSummary[] | null>(null)
  const [open, setOpen] = useState(false)

  async function load() {
    setRows(null)
    try {
      setRows(await listAllPromos())
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
        title="Promos"
        description="Discount codes"
        actions={
          <Button size="sm" variant="accent" onClick={() => setOpen(true)}>
            <Plus size={15} /> New promo
          </Button>
        }
      />
      <div className="p-6">
        <DataTable
          rowKey={(p: PromoSummary) => p.code}
          rows={rows}
          empty="No promos yet."
          columns={[
            { key: 'code', header: 'Code', render: (p) => <span className="font-mono font-medium text-accent">{p.code}</span> },
            { key: 'desc', header: 'Description', render: (p) => <span className="text-ink-2">{p.description}</span> },
            {
              key: 'discount',
              header: 'Discount',
              render: (p) =>
                p.percentOff != null ? <Badge variant="accent">{p.percentOff}% off</Badge> : p.flatOff != null ? <span className="text-ink"><Money paise={p.flatOff} /> off</span> : '–',
            },
            { key: 'min', header: 'Min spend', align: 'right', render: (p) => (p.minAmount ? <Money paise={p.minAmount} className="text-ink-3" /> : '–') },
            { key: 'valid', header: 'Valid until', render: (p) => <span className="text-xs text-ink-3">{formatDate(p.validTo)}</span> },
          ]}
        />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create promo">
        <PromoForm onClose={() => setOpen(false)} onSaved={load} />
      </Modal>
    </>
  )
}

function PromoForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<'percent' | 'flat'>('percent')
  const [value, setValue] = useState('10')
  const [minAmount, setMinAmount] = useState('')
  const [validTo, setValidTo] = useState(() => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createPromo({
        code: code.trim().toUpperCase(),
        description: description.trim(),
        percentOff: kind === 'percent' ? Number(value) : undefined,
        flatOff: kind === 'flat' ? Math.round(Number(value) * 100) : undefined,
        minAmount: minAmount ? Math.round(Number(minAmount) * 100) : undefined,
        validFrom: new Date().toISOString(),
        validTo: new Date(validTo + 'T23:59:59').toISOString(),
      })
      toast.success('Promo created')
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create promo.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <div className="rounded-lg status-danger p-2.5 text-xs">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SAVE20" className="uppercase font-mono" required /></Field>
        <Field label="Type">
          <div className="flex gap-1 h-9">
            {(['percent', 'flat'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)}
                className={`flex-1 rounded-md text-xs border transition-colors-fast ${kind === k ? 'bg-accent-bg text-accent border-accent' : 'bg-surface text-ink-2 border-line-2'}`}>
                {k === 'percent' ? '% off' : '₹ off'}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="20% off up to ₹150" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={kind === 'percent' ? 'Percent off' : 'Flat off (₹)'}>
          <Input type="number" min={1} value={value} onChange={(e) => setValue(e.target.value)} required />
        </Field>
        <Field label="Min spend (₹, optional)"><Input type="number" min={0} value={minAmount} onChange={(e) => setMinAmount(e.target.value)} /></Field>
      </div>
      <Field label="Valid until"><Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} required /></Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="accent" loading={saving}>Create promo</Button>
      </div>
    </form>
  )
}
