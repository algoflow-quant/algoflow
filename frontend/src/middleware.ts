import { updateSession } from '@/server/supabase/middleware'
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

// Custom middleware combining Arcjet + Supabase
export async function middleware(request: NextRequest) {
  // First run Arcjet protection
  const decision = await aj.protect(request)

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: "Forbidden", reason: decision.reason },
      { status: 403 }
    )
  }

  // Then run Supabase session update
  return await updateSession(request)
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
