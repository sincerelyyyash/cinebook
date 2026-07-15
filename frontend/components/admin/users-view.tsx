'use client'

import { useEffect, useState, useCallback } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react/ssr'
import { PageHeader } from '@/components/shell/dashboard-shell'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/admin/data-table'
import { useToast } from '@/components/providers/toast-provider'
import { listUsers, setUserActive, setUserRole } from '@/lib/api/admin'
import { ApiError } from '@/lib/api/client'
import { formatDate } from '@/lib/format/datetime'
import { cn } from '@/lib/design/cn'
import type { UserProfile } from '@/lib/api/dto'
import type { Role } from '@/lib/types'

const ROLES: Role[] = ['CUSTOMER', 'HALL_MANAGER', 'ADMIN']

export function UsersView() {
  const toast = useToast()
  const [rows, setRows] = useState<UserProfile[] | null>(null)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<string>('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setRows(null)
    try {
      const res = await listUsers({
        search: search || undefined,
        role: (role || undefined) as Role | undefined,
        pageSize: 100,
      })
      setRows(res.data)
    } catch {
      setRows([])
    }
  }, [search, role])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  async function toggleActive(u: UserProfile) {
    setBusyId(u.id)
    try {
      const updated = await setUserActive(u.id, !u.isActive)
      setRows((prev) => prev?.map((r) => (r.id === u.id ? updated : r)) ?? null)
      toast.success(updated.isActive ? 'Account enabled' : 'Account disabled')
    } catch (err) {
      toast.error('Could not update', err instanceof ApiError ? err.message : 'Try again.')
    } finally {
      setBusyId(null)
    }
  }

  async function changeRole(u: UserProfile, next: Role) {
    if (next === u.role) return
    setBusyId(u.id)
    try {
      const updated = await setUserRole(u.id, next)
      setRows((prev) => prev?.map((r) => (r.id === u.id ? updated : r)) ?? null)
      toast.success(`Role set to ${next.replace('_', ' ')}`)
    } catch (err) {
      toast.error('Could not change role', err instanceof ApiError ? err.message : 'Try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader title="Users" description="View, disable, and assign roles" />
      <div className="p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <Input placeholder="MagnifyingGlass name, email, phone…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-44">
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.replace('_', ' ')}</option>
            ))}
          </Select>
        </div>

        <DataTable
          rowKey={(u: UserProfile) => u.id}
          rows={rows}
          empty="No users match."
          columns={[
            {
              key: 'user',
              header: 'User',
              render: (u) => (
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.name || u.phoneNumber || '?'} size="sm" />
                  <div className="min-w-0">
                    <p className="text-ink truncate">{u.name || '–'}</p>
                    <p className="text-xs text-ink-3 truncate">{u.phoneNumber ?? u.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              render: (u) => (
                <Select
                  value={u.role}
                  disabled={busyId === u.id}
                  onChange={(e) => changeRole(u, e.target.value as Role)}
                  className="w-40 h-8 text-xs"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </Select>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (u) => <Badge variant={u.isActive ? 'positive' : 'neutral'} dot>{u.isActive ? 'Active' : 'Disabled'}</Badge>,
            },
            { key: 'joined', header: 'Joined', render: (u) => <span className="text-ink-3 text-xs">{formatDate(u.createdAt)}</span> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (u) => (
                <button
                  onClick={() => toggleActive(u)}
                  disabled={busyId === u.id}
                  className={cn(
                    'h-7 px-2.5 rounded-md text-xs border transition-colors-fast disabled:opacity-50',
                    u.isActive
                      ? 'text-danger-ink border-line-2 hover:border-danger-ink'
                      : 'text-positive-ink border-line-2 hover:border-positive-ink',
                  )}
                >
                  {u.isActive ? 'Disable' : 'Enable'}
                </button>
              ),
            },
          ]}
        />
      </div>
    </>
  )
}
