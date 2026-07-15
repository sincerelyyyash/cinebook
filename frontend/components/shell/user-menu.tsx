'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretDown, SignOut } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'
import { Avatar } from '@/components/ui/avatar'
import { RoleBadge } from '@/components/ui/badge'
import { logout } from '@/lib/auth/logout'
import { useUser } from '@/lib/auth/session'

/** Avatar + dropdown with the signed-in user and a logout action. */
export function UserMenu({ align = 'right', showChevron = false }: { align?: 'left' | 'right'; showChevron?: boolean }) {
  const user = useUser()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="interactive inline-flex items-center gap-1.5 rounded-md"
        aria-label="Account menu"
      >
        <Avatar name={user.name ?? user.phone} size="sm" />
        {showChevron && <CaretDown size={14} className="text-ink-3" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -2 }}
            transition={{ duration: 0.14 }}
            className={cn(
              'absolute z-50 mt-2 w-60 surface-overlay rounded-xl border border-line-2 p-1.5',
              align === 'right' ? 'right-0' : 'left-0',
            )}
            style={{ transformOrigin: align === 'right' ? 'top right' : 'top left' }}
          >
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <Avatar name={user.name ?? user.phone} size="md" />
              <div className="min-w-0">
                <p className="text-sm text-ink truncate">{user.name ?? 'Guest'}</p>
                <p className="text-xs text-ink-3 truncate">{user.phone}</p>
              </div>
            </div>
            <div className="px-2.5 pb-2"><RoleBadge role={user.role} /></div>
            <div className="h-px bg-line my-1" />
            <button
              onClick={async () => {
                setLoggingOut(true)
                await logout()
              }}
              disabled={loggingOut}
              className="w-full flex items-center gap-2 h-9 px-2.5 rounded-md text-sm text-ink-2 hover:bg-hover hover:text-danger-ink transition-colors-fast disabled:opacity-50"
            >
              <SignOut size={15} />
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
