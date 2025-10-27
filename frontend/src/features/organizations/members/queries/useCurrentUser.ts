'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { usePathname } from 'next/navigation'

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    let retryCount = 0
    const MAX_RETRIES = 3
    let shouldStopRetrying = false

    // Only retry on protected routes (starting with /lab)
    const isProtectedRoute = pathname?.startsWith('/lab')

    // Retry fetching session if initially null (handles post-login cookie sync delay)
    const fetchSessionWithRetry = async () => {
      if (shouldStopRetrying) return

      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)
        setLoading(false)
      } else if (isProtectedRoute && retryCount < MAX_RETRIES) {
        // Only retry on protected routes after login redirect
        retryCount++
        setTimeout(fetchSessionWithRetry, 700)
      } else {
        setUser(null)
        setLoading(false)
      }
    }

    // Start fetching session
    fetchSessionWithRetry()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Stop retrying when we get definitive auth state
      shouldStopRetrying = true

      if (session?.user) {
        setUser(session.user)
        setLoading(false)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      shouldStopRetrying = true
      subscription.unsubscribe()
    }
  }, [pathname])

  return { user, loading }
}
