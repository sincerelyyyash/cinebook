'use client'

import { cn } from '@/lib/design/cn'
import { Skeleton } from '@/components/ui/feedback'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

/** Minimal, consistent admin table with a loading + empty state. */
export function DataTable<T>({
  columns,
  rows,
  loading,
  empty,
  rowKey,
}: {
  columns: Column<T>[]
  rows: T[] | null
  loading?: boolean
  empty?: React.ReactNode
  rowKey: (row: T) => string
}) {
  return (
    <div className="rounded-xl border border-line-2 bg-surface overflow-hidden">
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    'text-label font-medium px-4 py-2.5 whitespace-nowrap',
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading || rows === null ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-3">
                  {empty ?? 'Nothing here yet.'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-line last:border-0 hover:bg-hover transition-colors-fast animate-enter"
                  style={{ animationDelay: `${Math.min(i * 22, 300)}ms` }}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'px-4 py-3 align-middle',
                        c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                        c.className,
                      )}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
