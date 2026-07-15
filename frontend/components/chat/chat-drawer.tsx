'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowsOut, Sparkle, X } from '@phosphor-icons/react/ssr'
import { ChatPanel } from './chat-panel'

/** Slide-in assistant drawer — chat from anywhere in the storefront. */
export function ChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9997]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            className="absolute right-0 top-0 h-full w-full sm:w-[440px] bg-page border-l border-line flex flex-col"
          >
            <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-line">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-accent text-accent-ink">
                  <Sparkle size={13} />
                </span>
                CineBook Assistant
              </span>
              <div className="flex items-center gap-1">
                <Link href="/chat" onClick={onClose} className="interactive h-8 w-8 rounded-md flex items-center justify-center text-ink-3 hover:text-ink" aria-label="Open full page">
                  <ArrowsOut size={15} />
                </Link>
                <button onClick={onClose} className="interactive h-8 w-8 rounded-md flex items-center justify-center text-ink-3 hover:text-ink" aria-label="Close">
                  <X size={16} />
                </button>
              </div>
            </header>
            <div className="flex-1 min-h-0">
              <ChatPanel />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
