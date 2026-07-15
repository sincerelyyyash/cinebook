import 'server-only'
import { cookies } from 'next/headers'
import { backendApiBase } from '@/lib/env'
import { SESSION_COOKIE } from '@/lib/auth/server'
import { parseResponse, type ApiFetchOptions } from './client'

/**
 * Server-side (RSC / route handler) API fetch. Reads the session cookie and
 * calls the backend origin directly with `Authorization: Bearer <token>`,
 * unwrapping the `{ data }` envelope. Use in Server Components for reads.
 */
export async function serverFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions & { auth?: boolean } = {},
): Promise<T> {
  const { body, headers, auth = true, cache, ...rest } = options

  let bearer: string | undefined
  if (auth) {
    const store = await cookies()
    bearer = store.get(SESSION_COOKIE)?.value
  }

  const res = await fetch(`${backendApiBase}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(headers as Record<string, string>),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // Reads are dynamic by default; callers can override with next.revalidate.
    cache: cache ?? 'no-store',
  })

  return parseResponse<T>(res)
}
