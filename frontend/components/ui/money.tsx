import { cn } from '@/lib/design/cn'
import { formatMoney } from '@/lib/format/money'

/** Render a paise amount as tabular-aligned rupees. */
export function Money({ paise, className }: { paise: number; className?: string }) {
  return <span className={cn('text-numeric', className)}>{formatMoney(paise)}</span>
}
