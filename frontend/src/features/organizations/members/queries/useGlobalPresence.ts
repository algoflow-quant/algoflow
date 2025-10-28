'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { updateLastSeen } from '@/features/profiles/settings/actions/updateLastSeen'

/**
 * Global presence system using Supabase Realtime Presence
 * Tracks which users are currently online anywhere in the app
 *
 * Features:
 * - Real-time online/offline status via Supabase Presence
 * - Updates last_seen_at only on login/logout (not polling)
 * - Global state shared across all components
 */

// Presence payload structure
interface PresencePayload {
  user_id: string
  online_at: string
}

// Supabase presence state type
type PresenceState = Record<string, PresencePayload[]>

// Global state: Track all currently online users
const onlineUsers = new Set<string>()

// Global listeners: Components that re-render on presence changes
const presenceListeners = new Set<() => void>()

// Notify all subscribed components when presence state changes
function notifyPresenceChange() {
  presenceListeners.forEach(listener => listener())
}

/**
 * Track current user's presence globally
 * Should be called once at app root level
 */
export function useGlobalPresence(userId: string | null) {
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    let presenceChannel: RealtimeChannel

    // Update last_seen_at on login (mount) - using DAL + ABAC
    const updatePresence = async () => {
      try {
        await updateLastSeen()
      } catch (error) {
        console.error('[Presence] Failed to update last_seen_at:', error)
      }
    }

    // Update on login
    updatePresence()

    // Create global presence channel with custom key (userId)
    presenceChannel = supabase.channel('app-global-presence', {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    // Sync: Rebuild online users from current state
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState() as PresenceState
      const previousSize = onlineUsers.size

      onlineUsers.clear()
      Object.values(state).forEach((presences) => {
        presences.forEach((presence) => {
          if (presence.user_id) {
            onlineUsers.add(presence.user_id)
          }
        })
      })

      // Only notify if state actually changed
      if (previousSize !== onlineUsers.size) {
        notifyPresenceChange()
      }
    })

    // Join: User comes online
    presenceChannel.on('presence', { event: 'join' }, ({ newPresences }) => {
      let changed = false
      newPresences.forEach((presence) => {
        if (presence.user_id && !onlineUsers.has(presence.user_id)) {
          onlineUsers.add(presence.user_id)
          changed = true
        }
      })
      if (changed) notifyPresenceChange()
    })

    // Leave: User goes offline
    presenceChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      let changed = false
      leftPresences.forEach((presence) => {
        if (presence.user_id && onlineUsers.has(presence.user_id)) {
          onlineUsers.delete(presence.user_id)
          changed = true
        }
      })
      if (changed) notifyPresenceChange()
    })

    // Subscribe and track presence
    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        })
      }
    })

    // Cleanup on logout (unmount)
    return () => {
      // Update last_seen_at on logout - using DAL + ABAC
      updatePresence().then(() => {
        // Untrack and unsubscribe
        if (presenceChannel) {
          presenceChannel.untrack().then(() => {
            presenceChannel.unsubscribe()
          })
        }
      })

      // Immediately remove from local state for instant UI update
      onlineUsers.delete(userId)
      notifyPresenceChange()
    }
  }, [userId])
}

/**
 * Subscribe to presence changes and trigger component re-renders
 */
export function usePresenceSubscription() {
  const [trigger, setTrigger] = useState(0)

  useEffect(() => {
    const listener = () => setTrigger(prev => prev + 1)
    presenceListeners.add(listener)
    return () => presenceListeners.delete(listener)
  }, [])

  return trigger
}

/**
 * Check if a user is currently online
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId)
}

/**
 * Get count of all currently online users
 */
export function getOnlineUserCount(): number {
  return onlineUsers.size
}

/**
 * Get all currently online user IDs
 */
export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers)
}
