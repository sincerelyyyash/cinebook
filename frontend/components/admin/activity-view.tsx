'use client'

import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/shell/dashboard-shell'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/admin/data-table'
import { listActivity } from '@/lib/api/admin'
import { formatDateTime } from '@/lib/format/datetime'
import type { ActivityRow } from '@/lib/api/dto'

const ACTION_PREFIXES = ['', 'booking.', 'payment.', 'show.', 'user.', 'promo.', 'chatbot.']

export function ActivityView() {
  const [rows, setRows] = useState<ActivityRow[] | null>(null)
  const [action, setAction] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setRows(null)
    try {
      const res = await listActivity({
        action: action || undefined,
        success: success === '' ? undefined : success === 'true',
        pageSize: 100,
      })
      setRows(res.data)
    } catch {
      setRows([])
    }
  }, [action, success])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  return (
    <>
      <PageHeader title="Activity Log" description="Every admin & chatbot action, for accountability" />
      <div className="p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-48">
            {ACTION_PREFIXES.map((p) => (
              <option key={p} value={p}>{p === '' ? 'All actions' : p.replace('.', '')}</option>
            ))}
          </Select>
          <Select value={success} onChange={(e) => setSuccess(e.target.value)} className="w-40">
            <option value="">All outcomes</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </Select>
          <Input
            placeholder="Filter action (e.g. show.create)"
            className="w-64"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
        </div>

        <DataTable
          rowKey={(r: ActivityRow) => r.id}
          rows={rows}
          empty="No activity recorded."
          columns={[
            { key: 'time', header: 'When', render: (r) => <span className="text-xs text-ink-3 whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
            {
              key: 'actor',
              header: 'Actor',
              render: (r) => (
                <div className="min-w-0">
                  <p className="text-ink truncate">{r.actorName ?? '–'}</p>
                  {r.actorRole && <p className="text-2xs text-ink-3">{r.actorRole.replace('_', ' ')}</p>}
                </div>
              ),
            },
            { key: 'action', header: 'Action', render: (r) => <span className="font-mono text-xs text-ink-2">{r.action}</span> },
            { key: 'target', header: 'Target', render: (r) => <span className="font-mono text-2xs text-ink-3 truncate">{r.target ?? '–'}</span> },
            { key: 'dur', header: 'Duration', align: 'right', render: (r) => <span className="text-xs text-ink-3">{r.durationMs != null ? `${r.durationMs}ms` : '–'}</span> },
            { key: 'ok', header: 'Result', align: 'center', render: (r) => <Badge variant={r.success ? 'positive' : 'danger'} size="xs">{r.success ? 'OK' : 'FAIL'}</Badge> },
          ]}
        />
      </div>
    </>
  )
}
