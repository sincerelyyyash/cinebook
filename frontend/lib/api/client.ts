import { bffBase } from '@/lib/env'

/**
 * Browser-side API client. Talks to the same-origin BFF proxy (`/api/bff/*`),
 * which forwards to the backend with the httpOnly bearer cookie attached. This
 * keeps the token out of JS and avoids CORS.
 *
 * Handles the backend's envelopes:
 *   success → { data: T }           (unwrapped to T)
 *   error   → { error: { code, message, details } }
 * Rate-limit responses carry a Retry-After header and details.retryAfterSec.
 */

export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
}

export class ApiError extends Error {
  code: string
  status: number
  details?: unknown
  retryAfter?: number

  constructor(status: number, body: ApiErrorBody, retryAfter?: number) {
    super(body.message || `Request failed (${status})`)
    this.name = 'ApiError'
    this.code = body.code || `HTTP_${status}`
    this.status = status
    this.details = body.details
    this.retryAfter = retryAfter
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

/** Parse a backend Response, unwrapping `{ data }` or throwing an ApiError. */
export async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T

  const text = await res.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!res.ok) {
    const body =
      payload && typeof payload === 'object' && 'error' in (payload as object)
        ? ((payload as { error: ApiErrorBody }).error ?? { code: `HTTP_${res.status}`, message: res.statusText })
        : { code: `HTTP_${res.status}`, message: typeof payload === 'string' ? payload : res.statusText }

    const header = res.headers.get('retry-after')
    const retryAfter =
      (body.details as { retryAfterSec?: number } | undefined)?.retryAfterSec ??
      (header ? Number(header) : undefined)

    throw new ApiError(res.status, body, retryAfter)
  }

  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options
  const url = `${bffBase}${path}`

  const res = await fetch(url, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers as Record<string, string>),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  return parseResponse<T>(res)
}

export const api = {
  get: <T>(path: string, opts?: ApiFetchOptions) => apiFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: 'PATCH', body }),
  del: <T>(path: string, opts?: ApiFetchOptions) => apiFetch<T>(path, { ...opts, method: 'DELETE' }),
}
