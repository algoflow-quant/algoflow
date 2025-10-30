'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { usePathname } from 'next/navigation'

// Hook to get the currently authenticated user
// we use useCurrentUser to maintain websocket connections properly & handle auth state changes
// Handles the post-login cookie sync delay by retrying on protected routes
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null) // Current authenticated user or null
  const [loading, setLoading] = useState(true) // Loading state while checking auth
  const pathname = usePathname() // Current route pathname

  useEffect(() => {
    // create Supabase client
    const supabase = createClient()
    let retryCount = 0
    let shouldStopRetrying = false

    // Only retry on protected routes (routes that require authentication)
    // Example: /lab/org/123 is protected, but /about is public
    const isProtectedRoute = pathname?.startsWith('/dashboard')

    // Try to get the user's session, with retries on protected routes
    // WHY RETRY? After OAuth login, there's a brief moment where the cookie hasn't synced yet
    // The browser redirects to /lab but the session cookie takes ~100-700ms to be readable
    // Without retries, user would see a flash of "not authenticated" before being logged in
    const fetchSessionWithRetry = async () => {
      if (shouldStopRetrying) return // exit condition to stop retries

      // get session from Supabase auth
      const { data: { session } } = await supabase.auth.getSession()

      // If we have a session with a user, set it and stop loading
      if (session?.user) {
        // Got the user, we're done
        setUser(session.user)
        setLoading(false)
      } else if (isProtectedRoute && retryCount < 3) {
        // On protected routes, retry up to 3 times with 700ms delay
        // This gives the cookie time to sync after OAuth redirect
        retryCount++
        setTimeout(fetchSessionWithRetry, 700)
      } else {
        // Either not a protected route or we've tried enough times
        setUser(null)
        setLoading(false)
      }
    }

    // Start the first fetch attempt
    fetchSessionWithRetry()

    // Listen for auth state changes (login, logout, token refresh)
    // This ensures we always have the latest user state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Once we get a definitive auth state change, stop retrying
      shouldStopRetrying = true
      setUser(session?.user || null)
      setLoading(false)
    })

    // Cleanup: unsubscribe from auth changes when component unmounts
    return () => {
      shouldStopRetrying = true
      subscription.unsubscribe()
    }
  }, [pathname]) // Re-run effect if pathname changes ie. user navigates on the dashboard

  return { user, loading }
}
