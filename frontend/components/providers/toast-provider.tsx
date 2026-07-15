'use client'

import { createContext, useContext, useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Info, Warning, X, XCircle } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'

type ToastKind = 'success' | 'warning' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  title: string
  description?: string
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastKind, React.ElementType> = {
  success: CheckCircle,
  warning: Warning,
  error: XCircle,
  info: Info,
}

const kindClasses: Record<ToastKind, string> = {
  success: 'text-positive-ink',
  warning: 'text-warning-ink',
  error: 'text-danger-ink',
  info: 'text-info-ink',
}

let counter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = ++counter
      setToasts((prev) => [...prev, { ...t, id }])
      setTimeout(() => remove(id), 5000)
    },
    [remove],
  )

  const success = useCallback(
    (title: string, description?: string) => toast({ kind: 'success', title, description }),
    [toast],
  )
  const error = useCallback(
    (title: string, description?: string) => toast({ kind: 'error', title, description }),
    [toast],
  )

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 w-[min(92vw,360px)]">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = icons[t.kind]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
                className="surface-overlay rounded-lg border border-line-2 p-3 flex gap-2.5 items-start"
              >
                <Icon size={16} className={cn('mt-0.5 shrink-0', kindClasses[t.kind])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-ink-2 mt-0.5 leading-snug">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="interactive text-ink-3 hover:text-ink rounded-sm p-0.5 shrink-0"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
