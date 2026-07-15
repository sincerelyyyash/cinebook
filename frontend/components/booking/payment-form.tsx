'use client'

import { useState } from 'react'
import { CircleNotch, CreditCard, Lock } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'
import { Input, Field } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { TEST_CARDS, formatCardNumber } from '@/lib/payment'

/**
 * Simulated payment form. Card entry with one-tap test-card fill; the parent
 * runs start → confirm and owns the processing/error states.
 */
export function PaymentForm({
  amount,
  processing,
  onPay,
}: {
  amount: number
  processing: boolean
  onPay: (cardNumber: string) => void
}) {
  const [card, setCard] = useState('')
  const digits = card.replace(/\D/g, '')
  const valid = digits.length >= 12 && digits.length <= 19

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-label">Test cards</span>
        <div className="flex flex-wrap gap-1.5">
          {TEST_CARDS.map((c) => (
            <button
              key={c.number}
              type="button"
              disabled={processing}
              onClick={() => setCard(c.number)}
              className={cn(
                'h-7 px-2.5 rounded-md text-xs border transition-colors-fast disabled:opacity-50',
                'bg-surface border-line-2 hover:border-line-strong',
                c.kind === 'success' ? 'text-positive-ink' : c.kind === 'fail' ? 'text-danger-ink' : 'text-warning-ink',
              )}
              title={c.number}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Card number">
        <div className="relative">
          <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4111 1111 1111 1111"
            className="pl-9 font-mono tracking-wide"
            value={card}
            onChange={(e) => setCard(formatCardNumber(e.target.value))}
            disabled={processing}
          />
        </div>
      </Field>

      <Button variant="accent" fullWidth disabled={!valid || processing} onClick={() => onPay(digits)}>
        {processing ? (
          <>
            <CircleNotch size={15} className="animate-spin-slow" /> Processing…
          </>
        ) : (
          <>
            <Lock size={14} /> Pay <Money paise={amount} />
          </>
        )}
      </Button>
      <p className="text-2xs text-ink-3 text-center">
        Simulated payment · no real card is charged · processing takes 1–3s
      </p>
    </div>
  )
}
