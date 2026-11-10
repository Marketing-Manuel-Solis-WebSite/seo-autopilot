import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseProxyClient } from '@/lib/supabase/proxy'
import { isAllowedEmail } from '@/lib/auth/allowlist'

/**
 * Next.js 16 Proxy (replaces middleware.ts)
 *
 * Auth enforcement:
 * - Public: /, /login, /api/cron/* (protected by CRON_SECRET separately),
 *   /api/stripe/webhook (protected by the Stripe signature)
 * - Protected pages: redirect to /login
 * - Protected API routes: return 401 JSON
 * - A valid session whose email is not in the allowlist gets 403 / back to /login
 */

const PUBLIC_PATHS = ['/', '/login', '/api/stripe/webhook']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith('/api/cron/')) return true
  if (pathname.startsWith('/api/auth/gsc')) return true
  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname) && pathname !== '/login') {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createSupabaseProxyClient(request, response)
  const { data: { user } } = await supabase.auth.getUser()

  if (pathname === '/login') {
    // Only an allowed, signed-in user skips the login form
    if (user && isAllowedEmail(user.email)) {
      return NextResponse.redirect(new URL('/resultados', request.url))
    }
    return response
  }

  if (user && !isAllowedEmail(user.email)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'This account has no access' },
        { status: 403 },
      )
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'no_autorizado')
    return NextResponse.redirect(loginUrl)
  }

  if (!user) {
    // API routes: return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid Supabase session required' },
        { status: 401 },
      )
    }
    // Page routes: redirect to /login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|public/).*)',
  ],
}
