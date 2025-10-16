import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Only run auth checks on protected routes
  if (request.nextUrl.pathname.startsWith('/lab')) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Check user role from profile with timeout
    const profilePromise = supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile check timeout')), 3000)
    )

    try {
      const result = await Promise.race([profilePromise, timeoutPromise])
      const profile = (result as { data: { role: string } | null }).data

      // If user is on waitlist, redirect to waitlist page
      if (profile?.role === 'waitlist') {
        const url = request.nextUrl.clone()
        url.pathname = '/waitlist-pending'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      // If profile check times out or fails, allow through (fail open)
      console.error('Profile check failed:', error)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
