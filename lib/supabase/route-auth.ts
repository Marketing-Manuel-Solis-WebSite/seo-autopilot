import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isAllowedEmail } from '@/lib/auth/allowlist'

/**
 * Verifies Supabase auth session in API route handlers.
 * Returns the authenticated user or a 401 response.
 */
export async function requireAuth(): Promise<
  | { user: { id: string; email?: string }; error: null }
  | { user: null; error: NextResponse }
> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        },
      },
    },
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized', message: 'Valid Supabase session required' },
        { status: 401 },
      ),
    }
  }

  if (!isAllowedEmail(user.email)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Forbidden', message: 'This account has no access' },
        { status: 403 },
      ),
    }
  }

  return { user: { id: user.id, email: user.email }, error: null }
}
