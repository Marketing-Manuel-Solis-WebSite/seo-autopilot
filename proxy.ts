import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseProxyClient } from '@/lib/supabase/proxy'

/**
 * Next.js 16 Proxy (replaces middleware.ts)
 *
 * Auth enforcement:
 * - Public: /, /login, /api/cron/* (protected by CRON_SECRET separately)
 * - Protected pages: redirect to /login
 * - Protected API routes: return 401 JSON
 */

const PUBLIC_PATHS = ['/', '/login']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith('/api/cron/')) return true
  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createSupabaseProxyClient(request, response)
  const { data: { user } } = await supabase.auth.getUser()

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

  // Authenticated user visiting /login → redirect to dashboard
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|public/).*)',
  ],
}
