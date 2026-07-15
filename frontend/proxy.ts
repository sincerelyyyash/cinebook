import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/server'

/**
 * Edge route gate (Next.js `proxy` convention, formerly `middleware`).
 * This is defense-in-depth, not the primary authorization —
 * the backend enforces RBAC and Hall-Manager screen scoping. Here we only:
 *   - bounce unauthenticated users to /login (except public + auth routes)
 *   - keep authenticated users out of the auth screens
 *
 * Fine-grained per-role redirects happen in the role-group server layouts, which
 * have the resolved user (role) available.
 */

const PUBLIC_PREFIXES = ['/login', '/verify', '/_next', '/favicon', '/api/session']

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const devAuth = process.env.NEXT_PUBLIC_DEV_FAKE_AUTH === '1'
  const hasSession = devAuth || Boolean(req.cookies.get(SESSION_COOKIE)?.value)

  if (isPublic(pathname)) {
    // Signed-in users shouldn't sit on the login screen. In dev-fake-auth we
    // keep /login reachable so reviewers can switch the previewed role.
    if (!devAuth && hasSession && (pathname === '/login' || pathname === '/verify')) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  if (!hasSession) {
    const url = new URL('/login', req.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Exclude /api (the BFF + session routes handle their own auth) and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
