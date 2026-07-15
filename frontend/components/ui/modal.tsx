'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'

/** Centered modal with backdrop, Esc-to-close, and scale-in animation. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.16, ease: [0.22, 0.61, 0.36, 1] }}
            className={cn(
              'relative w-full max-w-md surface-overlay rounded-2xl border border-line-2 max-h-[90vh] overflow-y-auto scroll-thin',
              className,
            )}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 p-5 pb-3">
                <div>
                  {title && <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>}
                  {description && <p className="text-sm text-ink-2 mt-0.5">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="interactive text-ink-3 hover:text-ink rounded-md p-1 -mr-1 -mt-1"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div className={cn(title || description ? 'px-5 pb-5' : 'p-5')}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
