import { createServerClient } from '@supabase/ssr'
import arcjet, { detectBot, shield } from "@arcjet/next"
import { type NextRequest, NextResponse } from 'next/server'

// Arcjet protection rules
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    // Bot detection - block automated clients
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
      ],
    }),
    // Shield WAF - protect against common attacks
    shield({
      mode: "LIVE",
    }),
  ],
})

// Consolidated middleware: Arcjet + Supabase session + auth
export async function middleware(request: NextRequest) {
  // Step 1: Arcjet protection
  const decision = await aj.protect(request)

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: "Forbidden", reason: decision.reason },
      { status: 403 }
    )
  }

  // Step 2: Supabase session management
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Step 3: Protect /lab routes - redirect to login if not authenticated
  if (!user && request.nextUrl.pathname.startsWith('/lab')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Step 4: Check organization access for organization-specific routes
  // TODO: Remove this when ABAC is implemented (will handle in application layer)
  if (user && request.nextUrl.pathname.match(/^\/lab\/[a-f0-9-]{36}/)) {
    const organizationId = request.nextUrl.pathname.split('/')[2]

    // Check if user is a member of this organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    // If not a member, redirect to /lab
    if (!membership) {
      const url = request.nextUrl.clone()
      url.pathname = '/lab'
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /lab routes are protected (requires authentication)
     */
    '/lab/:path*',  // Protect all lab routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
