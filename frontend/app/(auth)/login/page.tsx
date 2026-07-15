'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CircleNotch, Copy, Phone } from '@phosphor-icons/react/ssr'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { useToast } from '@/components/providers/toast-provider'
import { api, ApiError } from '@/lib/api/client'

/** Demo accounts — the backend seeds these and echoes the OTP in dev. */
const DEMO = [
  { role: 'Customer', phone: '+919000000003' },
  { role: 'Manager', phone: '+919000000002' },
  { role: 'Admin', phone: '+919000000001' },
]

/** Keep only a leading + and digits — spaces/dashes break backend validation. */
const clean = (v: string) => v.replace(/[^\d+]/g, '')

export default function LoginPage() {
  const router = useRouter()
  const toast = useToast()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    const p = clean(phone)
    if (!p) return
    setLoading(true)
    try {
      // Request the OTP. In dev the backend echoes the code, so we verify it
      // immediately and sign in — enter number, you're in. (No SMS to wait for.)
      const { devCode } = await api.post<{ message: string; devCode?: string }>(
        '/auth/otp/request',
        { phone: p },
      )
      if (devCode) {
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: p, code: devCode }),
        })
        if (!res.ok) throw new Error('verify failed')
        const { home } = (await res.json()) as { home: string }
        router.push(home)
        router.refresh()
        return
      }
      // No echo (prod): fall back to the code-entry screen.
      router.push(`/verify?phone=${encodeURIComponent(p)}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        toast.error('Too many attempts', `Wait ${err.retryAfter ?? 60}s and try again.`)
      } else if (err instanceof ApiError && err.status === 401) {
        toast.error('Invalid number', 'That number isn’t registered. Use a demo number below.')
      } else if (err instanceof ApiError) {
        toast.error('Could not sign in', err.message)
      } else {
        toast.error('Could not sign in', 'Please try again.')
      }
      setLoading(false)
    }
  }

  async function copy(p: string) {
    try {
      await navigator.clipboard.writeText(p)
      setCopied(p)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* clipboard blocked — the number is still selectable */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-ink">Welcome to CineBook</h1>
        <p className="text-sm text-ink-2">Enter a phone number to sign in.</p>
      </div>

      <form onSubmit={signIn} className="flex flex-col gap-3">
        <Field label="Phone number">
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+919000000003"
              className="pl-9 font-mono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
          </div>
        </Field>
        <Button type="submit" variant="accent" fullWidth loading={loading} disabled={!clean(phone)}>
          Sign in
        </Button>
      </form>

      {/* Copiable demo numbers — tap to fill, or copy. */}
      <div className="flex flex-col gap-2">
        <span className="text-2xs uppercase tracking-widest text-ink-dim">Demo accounts</span>
        {DEMO.map((d) => (
          <div
            key={d.phone}
            className="flex items-center gap-3 rounded-lg border border-line-2 bg-surface px-3 py-2"
          >
            <span className="text-xs text-ink-2 w-20 shrink-0">{d.role}</span>
            <button
              type="button"
              onClick={() => setPhone(d.phone)}
              title="Use this number"
              className="flex-1 text-left font-mono text-sm text-ink select-all hover:text-accent transition-colors-fast"
            >
              {d.phone}
            </button>
            <button
              type="button"
              onClick={() => copy(d.phone)}
              aria-label={`Copy ${d.role} number`}
              className="interactive h-7 w-7 rounded-md border border-line-2 flex items-center justify-center text-ink-3 hover:text-ink shrink-0"
            >
              {copied === d.phone ? <Check size={13} className="text-positive-ink" /> : <Copy size={13} />}
            </button>
          </div>
        ))}
        <p className="text-2xs text-ink-dim">Tap a number to fill it in, then Sign in.</p>
      </div>
    </div>
  )
}
