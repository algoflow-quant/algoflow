'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/server/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// TypeScript interfaces for presence data
interface PresencePayload {
  user_id: string
  online_at: string
}

interface SupabasePresenceState {
  [key: string]: PresencePayload[]
}

// Track online users globally using Supabase Presence
const onlineUsers = new Set<string>()

// Listeners that get notified when presence changes
const presenceListeners = new Set<() => void>()

// Notify all listeners when presence changes
function notifyPresenceChange() {
  presenceListeners.forEach(listener => listener())
}

const LAST_SEEN_UPDATE_INTERVAL = 300000 // 5 minutes

export function useGlobalPresence(userId: string | null) {
  useEffect(() => {
    if (!userId) {
      return
    }

    const supabase = createClient()
    let presenceChannel: RealtimeChannel

    // Update last_seen_at for historical data (every 5 minutes)
    const updateLastSeen = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', userId)
      } catch (error) {
        console.error('Failed to update last_seen_at:', error)
      }
    }

    // Initial update
    updateLastSeen()

    // Set up interval to update every 5 minutes
    const lastSeenInterval = setInterval(updateLastSeen, LAST_SEEN_UPDATE_INTERVAL)

    // Create a single global presence channel for all users with unique key per user
    presenceChannel = supabase.channel('presence-global', {
      config: {
        presence: {
          key: userId, // Unique key for this user
        },
      },
    })

    // STEP 1: Set up event listeners BEFORE subscribing
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState() as SupabasePresenceState

        onlineUsers.clear()
        Object.keys(state).forEach((key) => {
          const presences = state[key]
          presences.forEach((presence) => {
            if (presence.user_id) {
              onlineUsers.add(presence.user_id)
            }
          })
        })
        notifyPresenceChange()
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence) => {
          const payload = presence as unknown as PresencePayload
          if (payload.user_id) {
            onlineUsers.add(payload.user_id)
          }
        })
        notifyPresenceChange()
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence) => {
          const payload = presence as unknown as PresencePayload
          if (payload.user_id) {
            onlineUsers.delete(payload.user_id)
          }
        })
        notifyPresenceChange()
      })

    // STEP 2: Subscribe to the channel
    presenceChannel.subscribe(async (status) => {
      // STEP 3: Only track presence after successfully subscribed
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        })
      }
    })

    // Cleanup
    return () => {
      clearInterval(lastSeenInterval)

      // Untrack and then unsubscribe
      if (presenceChannel) {
        presenceChannel.untrack().then(() => {
          presenceChannel.unsubscribe()
        })
      }

      // Immediately remove from local state
      onlineUsers.delete(userId)
      notifyPresenceChange()
    }
  }, [userId])
}

// Hook to subscribe to presence changes and trigger re-renders
export function usePresenceSubscription() {
  const [, setTrigger] = useState(0)

  useEffect(() => {
    const listener = () => {
      setTrigger(prev => prev + 1)
    }

    presenceListeners.add(listener)

    return () => {
      presenceListeners.delete(listener)
    }
  }, [])
}

// Helper function to check if a user is online using Presence
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId)
}
