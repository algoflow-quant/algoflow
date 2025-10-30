'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { updateLastSeen } from '@/features/organizations/members/actions/updateLastSeen'

// What each presence message looks like when sent over the wire
interface PresencePayload {
  user_id: string
  online_at: string
}

// Supabase stores presence as a record where each key is a user and value is their presence data
type PresenceState = Record<string, PresencePayload[]>

// Global set of all users who are currently online (shared across all components)
const onlineUsers = new Set<string>()

// Global list of components that want to re-render when presence changes
const presenceListeners = new Set<() => void>()

// Tell all listening components that someone went online or offline
function notifyPresenceChange() {
  presenceListeners.forEach(listener => listener()) // call each listener to trigger re-render
}

// Main hook: tracks current user's presence and listens to everyone else's presence
// Call this once at the app root level (like in a layout component)
export function useGlobalPresence(userId: string | null) {
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    let presenceChannel: RealtimeChannel

    // Update the user's last_seen_at timestamp in the database
    const updatePresence = async () => {
      try {
        await updateLastSeen() // update last seen via server action
      } catch (error) {
        console.error('[Presence] Failed to update last_seen_at:', error)
      }
    }

    // Update timestamp when user first comes online
    updatePresence()

    // Create a global presence channel that everyone shares
    // Each user gets a unique key so Supabase can track them individually
    presenceChannel = supabase.channel('app-global-presence', {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    // Sync event: fired when we first connect or when presence state gets rebuilt
    // This gives us the full list of everyone who's currently online
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState() as PresenceState // get full presence state
      const previousSize = onlineUsers.size // remember previous count

      // Rebuild our local set of online users from the full state
      onlineUsers.clear() // clear current state
      Object.values(state).forEach((presences) => { // for each user
        presences.forEach((presence) => { // for each presence record
          if (presence.user_id) { // ensure user_id exists
            onlineUsers.add(presence.user_id) // add user to online set
          }
        })
      })

      // Only trigger re-renders if the count actually changed
      if (previousSize !== onlineUsers.size) {
        notifyPresenceChange()
      }
    })

    // Join event: someone just came online
    presenceChannel.on('presence', { event: 'join' }, ({ newPresences }) => { // array of new presences
      let changed = false // track if anything changed
      newPresences.forEach((presence) => { // for each new presence
        if (presence.user_id && !onlineUsers.has(presence.user_id)) { // if new user
          onlineUsers.add(presence.user_id) // add to online set
          changed = true // mark that something changed
        }
      })
      if (changed) notifyPresenceChange() // notify if there was a change
    })

    // Leave event: someone just went offline
    presenceChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => { // array of left presences
      let changed = false // track if anything changed
      leftPresences.forEach((presence) => { // for each left presence
        if (presence.user_id && onlineUsers.has(presence.user_id)) { // if user was online
          onlineUsers.delete(presence.user_id) // remove from online set
          changed = true // mark that something changed
        }
      })
      if (changed) notifyPresenceChange() // notify if there was a change
    })

    // Subscribe to the channel and start broadcasting our presence
    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') { // successfully subscribed
        // Tell everyone else we're online
        await presenceChannel.track({ // our presence data
          user_id: userId, // our user ID
          online_at: new Date().toISOString(), // timestamp
        })
      }
    })

    // Cleanup when user logs out or component unmounts
    return () => {
      // Update last_seen_at one final time
      updatePresence().then(() => {
        // Stop broadcasting and disconnect
        if (presenceChannel) { // ensure channel exists
          presenceChannel.untrack().then(() => { // stop tracking presence
            presenceChannel.unsubscribe() // unsubscribe from channel
          })
        }
      })

      // Remove from local state immediately for instant UI updates
      onlineUsers.delete(userId) // remove ourselves from online set
      notifyPresenceChange() // notify listeners
    }
  }, [userId])
}

// Hook for components that need to re-render when presence changes
// HOW IT WORKS: Components call this hook and get a "trigger" number back
// When someone goes online/offline, we increment the trigger, which causes a re-render
// Think of it like a version number that bumps up whenever presence state changes
export function usePresenceSubscription() {
  const [trigger, setTrigger] = useState(0) // simple counter to trigger re-renders

  useEffect(() => { 
    // Our listener just increments the trigger (prev is old value, we return new value)
    const listener = () => setTrigger(prev => prev + 1)

    // Add ourselves to the global list of listeners
    presenceListeners.add(listener)

    // Cleanup: remove ourselves when component unmounts
    return () => {
      presenceListeners.delete(listener)
    }
  }, [])

  return trigger
}

// Check if a specific user is currently online
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId)
}

// Get total count of online users
export function getOnlineUserCount(): number {
  return onlineUsers.size
}

// Get array of all online user IDs
export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers)
}
