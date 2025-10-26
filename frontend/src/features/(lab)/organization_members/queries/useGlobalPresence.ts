'use client'

import { useEffect } from 'react'
import { createClient } from '@/server/supabase/client'

const PRESENCE_UPDATE_INTERVAL = 60000 // 60 seconds
const PRESENCE_ONLINE_THRESHOLD = 120000 // 2 minutes

export function useGlobalPresence(userId: string | null) {
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    // Update last_seen_at immediately on mount
    const updatePresence = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId)
    }

    // Initial update
    updatePresence()

    // Set up interval to update every 60 seconds
    const intervalId = setInterval(updatePresence, PRESENCE_UPDATE_INTERVAL)

    // Update on visibility change (when tab becomes active)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updatePresence()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId])
}

// Helper function to check if a user is online based on last_seen_at
export function isUserOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false

  const lastSeen = new Date(lastSeenAt).getTime()
  const now = Date.now()

  return (now - lastSeen) < PRESENCE_ONLINE_THRESHOLD
}
