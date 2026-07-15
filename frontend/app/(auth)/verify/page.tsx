'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { useToast } from '@/components/providers/toast-provider'
import type { Role } from '@/lib/types'

const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_FAKE_AUTH === '1'

function VerifyInner() {
  const router = useRouter()
  const params = useSearchParams()
  const toast = useToast()
  const phone = params.get('phone') ?? ''
  const devCode = params.get('dev') ?? ''

  const [code, setCode] = useState(devCode)
  const [role, setRole] = useState<Role>('CUSTOMER')
  const [loading, setLoading] = useState(false)

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Establish the session cookie via the BFF route. In dev-fake-auth the
      // chosen role is honored so all three experiences are reviewable; with the
      // real backend this proxies POST /auth/otp/verify and stores the bearer.
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, role }),
      })
      if (!res.ok) throw new Error('verify failed')
      const { home } = (await res.json()) as { home: string }
      router.push(home)
      router.refresh()
    } catch {
      toast.error('Invalid code', 'Please re-enter the code we sent you.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-ink">Enter code</h1>
        <p className="text-sm text-ink-2">
          We sent a 6-digit code to <span className="text-ink">{phone || 'your phone'}</span>.
        </p>
      </div>

      <Field
        label="Verification code"
        hint={
          DEV_AUTH
            ? 'Dev mode: any 6 digits work.'
            : devCode
              ? `Dev: code ${devCode} was echoed by the backend.`
              : undefined
        }
      >
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••••"
          maxLength={6}
          className="tracking-[0.5em] text-center text-lg font-mono"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          required
        />
      </Field>

      {DEV_AUTH && (
        <Field label="Preview role (dev only)">
          <div className="grid grid-cols-3 gap-2">
            {(['CUSTOMER', 'HALL_MANAGER', 'ADMIN'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`h-8 rounded-md text-xs font-mono uppercase tracking-wide border transition-colors-fast ${
                  role === r
                    ? 'bg-accent-bg text-accent border-accent'
                    : 'bg-surface text-ink-2 border-line-2 hover:border-line-strong'
                }`}
              >
                {r === 'HALL_MANAGER' ? 'Manager' : r === 'CUSTOMER' ? 'Customer' : 'Admin'}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Button type="submit" variant="accent" fullWidth loading={loading} disabled={code.length < 6}>
        Verify & continue
      </Button>
    </form>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="h-40 skeleton rounded-lg" />}>
      <VerifyInner />
    </Suspense>
  )
}
