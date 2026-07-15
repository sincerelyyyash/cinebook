import { type NextRequest, NextResponse } from 'next/server'
import { backendApiBase } from '@/lib/env'
import { SESSION_COOKIE } from '@/lib/auth/server'

/**
 * BFF reverse-proxy. Forwards `/api/bff/<path>` → `<backend>/api/<path>`,
 * attaching the httpOnly session token as a bearer header. The browser calls
 * this same-origin (cookie sent automatically), so the token never touches JS
 * and there's no cross-origin CORS to configure.
 */

async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  const suffix = path.join('/')
  const search = req.nextUrl.search
  const target = `${backendApiBase}/${suffix}${search}`

  const token = req.cookies.get(SESSION_COOKIE)?.value

  const headers = new Headers()
  const contentType = req.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  headers.set('accept', req.headers.get('accept') ?? 'application/json')
  if (token) headers.set('authorization', `Bearer ${token}`)

  const method = req.method
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer()

  const res = await fetch(target, {
    method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
    redirect: 'manual',
  })

  // Pass through status + body; carry trace id for correlation.
  const resHeaders = new Headers()
  const passthrough = ['content-type', 'x-trace-id', 'retry-after', 'cache-control']
  for (const h of passthrough) {
    const v = res.headers.get(h)
    if (v) resHeaders.set(h, v)
  }

  // 204/304 are null-body statuses — a body (even empty) is invalid.
  if (res.status === 204 || res.status === 304) {
    return new NextResponse(null, { status: res.status, headers: resHeaders })
  }

  // Stream the body through unbuffered so SSE (chat) flushes token-by-token.
  // A piped ReadableStream works for JSON responses too.
  return new NextResponse(res.body, { status: res.status, headers: resHeaders })
}

type Ctx = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path)
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path)
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path)
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path)
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path)
}
