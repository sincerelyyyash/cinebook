'use client'

import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { CircleNotch } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'
import { easeSpring } from '@/lib/design/motion'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  children: React.ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-canvas font-medium hover:bg-accent-2 disabled:opacity-40 disabled:cursor-not-allowed elevated-xs',
  accent: 'bg-accent text-accent-ink font-medium hover:bg-accent-2 disabled:opacity-40 disabled:cursor-not-allowed elevated-xs',
  secondary: 'bg-surface text-ink border border-line-2 hover:bg-raised hover:border-line-strong disabled:opacity-40 disabled:cursor-not-allowed elevated-xs',
  ghost: 'bg-transparent text-ink-2 hover:bg-hover hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed',
  danger: 'bg-danger-bg text-danger-ink border border-line-2 hover:bg-danger-ink hover:text-canvas hover:border-danger-ink disabled:opacity-40 disabled:cursor-not-allowed',
}

const sizes: Record<Size, string> = {
  xs: 'h-6 px-2.5 text-xs gap-1.5 rounded-sm',
  sm: 'h-7 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-9 px-4 text-base gap-2 rounded-md',
  lg: 'h-10 px-5 text-md gap-2 rounded-md',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <motion.button
      whileHover={isDisabled ? undefined : { scale: 1.015 }}
      whileTap={isDisabled ? undefined : { scale: 0.975 }}
      transition={easeSpring}
      disabled={isDisabled}
      className={cn(
        'relative inline-flex items-center justify-center select-none font-sans cursor-pointer transition-colors-fast',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <CircleNotch size={14} className="animate-spin-slow text-current opacity-70" />
        </span>
      )}
      <span className={cn('inline-flex items-center gap-[inherit] transition-opacity', loading ? 'opacity-0' : 'opacity-100')}>
        {children}
      </span>
    </motion.button>
  )
}
