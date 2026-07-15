import * as React from 'react'
import { cn } from '@/lib/design/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full h-9 px-3 rounded-md bg-field text-ink placeholder:text-ink-3',
        'border border-line-2 transition-colors-fast',
        'hover:border-line-strong focus:border-accent focus:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        invalid && 'border-danger-ink focus:border-danger-ink',
        className,
      )}
      {...props}
    />
  )
})

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full px-3 py-2 rounded-md bg-field text-ink placeholder:text-ink-3 resize-none',
        'border border-line-2 transition-colors-fast scroll-thin',
        'hover:border-line-strong focus:border-accent focus:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        invalid && 'border-danger-ink focus:border-danger-ink',
        className,
      )}
      {...props}
    />
  )
})

/** Labeled field wrapper. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-label">{label}</span>}
      {children}
      {error ? (
        <span className="text-xs text-danger-ink">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-3">{hint}</span>
      ) : null}
    </label>
  )
}
