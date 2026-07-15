import { NextResponse } from 'next/server'
import { SESSION_COOKIE, ROLE_COOKIE } from '@/lib/auth/server'
import { roleHome } from '@/lib/auth/roles'
import { backendApiBase, devFakeAuth } from '@/lib/env'
import type { Role } from '@/lib/types'

/**
 * BFF session endpoint. Exchanges an OTP for a session and stores the backend
 * bearer token in an httpOnly cookie so it's never readable from JS.
 * Proxies POST /api/auth/otp/verify. In dev-fake-auth it just sets marker
 * cookies + the chosen preview role.
 */
export async function POST(req: Request) {
  const { phone, code, role } = (await req.json()) as {
    phone: string
    code: string
    role?: Role
  }

  if (devFakeAuth) {
    const chosen: Role = role ?? 'CUSTOMER'
    const res = NextResponse.json({ home: roleHome[chosen] })
    res.cookies.set(SESSION_COOKIE, 'dev', { httpOnly: true, sameSite: 'lax', path: '/' })
    res.cookies.set(ROLE_COOKIE, chosen, { httpOnly: true, sameSite: 'lax', path: '/' })
    return res
  }

  const backendRes = await fetch(`${backendApiBase}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ phone, code }),
  })

  const json = (await backendRes.json().catch(() => null)) as
    | { data: { token: string; user: { role: Role } } }
    | { error: { message: string } }
    | null

  if (!backendRes.ok || !json || 'error' in json) {
    const message = json && 'error' in json ? json.error.message : 'Verification failed'
    return NextResponse.json({ error: message }, { status: backendRes.status || 401 })
  }

  const { token, user } = json.data
  const res = NextResponse.json({ home: roleHome[user.role] })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}

/** Logout — clear the session (best-effort backend revoke), then drop cookies. */
export async function DELETE(req: Request) {
  if (!devFakeAuth) {
    const token = req.headers.get('cookie')?.match(/cb_session=([^;]+)/)?.[1]
    if (token) {
      await fetch(`${backendApiBase}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  res.cookies.delete(ROLE_COOKIE)
  return res
}
