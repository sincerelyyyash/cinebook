'use client'

import { Moon, Sun } from '@phosphor-icons/react/ssr'
import { motion } from 'framer-motion'
import { useTheme } from '@/components/providers/theme-provider'
import { cn } from '@/lib/design/cn'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        'interactive inline-flex items-center justify-center h-8 w-8 rounded-md',
        'text-ink-2 hover:text-ink border border-line-2',
        className,
      )}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
      </motion.span>
    </button>
  )
}
