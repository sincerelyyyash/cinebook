import * as React from 'react'
import { CaretDown } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

/** Styled native select. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full h-9 pl-3 pr-8 rounded-md bg-field text-ink appearance-none cursor-pointer',
          'border border-line-2 transition-colors-fast',
          'hover:border-line-strong focus:border-accent focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          invalid && 'border-danger-ink focus:border-danger-ink',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <CaretDown
        size={15}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
      />
    </div>
  )
})
