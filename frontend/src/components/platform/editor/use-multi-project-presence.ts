import { useEffect, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface PresenceUser {
  userId: string
  userName: string
  avatarUrl?: string
  projectId: string
  fileName?: string
  color: string
}

// Global store for all project presence data
class MultiProjectPresenceManager {
  private usersByProject = new Map<string, PresenceUser[]>()
  private listeners = new Set<() => void>()
  private channels = new Map<string, RealtimeChannel>()
  private supabase = createClient()

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getUsers(): PresenceUser[] {
    const allUsers: PresenceUser[] = []
    this.usersByProject.forEach(users => {
      allUsers.push(...users)
    })
    return allUsers
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }

  async subscribeToProjects(projectIds: string[]) {
    console.log('[MultiPresence] subscribeToProjects called with:', projectIds.length, 'projects')

    // Only process valid project IDs
    const validProjectIds = projectIds.filter(id => id && id.length > 0)
    console.log('[MultiPresence] Valid project IDs:', validProjectIds)

    // Unsubscribe from projects no longer in the list
    const projectsToRemove: string[] = []
    for (const [projectId] of this.channels.entries()) {
      if (!validProjectIds.includes(projectId)) {
        projectsToRemove.push(projectId)
      }
    }

    // Batch unsubscribe to avoid timing issues
    for (const projectId of projectsToRemove) {
      const channelToRemove = this.channels.get(projectId)
      if (channelToRemove) {
        console.log('[MultiPresence] Unsubscribing from project:', projectId)
        channelToRemove.unsubscribe()
        this.channels.delete(projectId)
        this.usersByProject.delete(projectId)
      }
    }

    // Subscribe to new projects (limit to prevent too many subscriptions)
    const maxProjects = 10 // Limit to prevent timeout issues
    const projectsToSubscribe = validProjectIds.slice(0, maxProjects)
    console.log('[MultiPresence] Will subscribe to:', projectsToSubscribe.length, 'projects')

    for (const projectId of projectsToSubscribe) {
      if (this.channels.has(projectId)) {
        console.log('[MultiPresence] Already subscribed to:', projectId)
        continue // Already subscribed
      }

      console.log('[MultiPresence] Creating channel for project:', projectId)
      const channelName = `presence:project:${projectId}`

      try {
        const channel = this.supabase.channel(channelName)

        // Set up the presence sync handler
        channel.on('presence', { event: 'sync' }, () => {
          console.log('[MultiPresence] Presence sync for project:', projectId)
          const state = channel.presenceState()
          console.log('[MultiPresence] Presence state:', state)

          // Use a Map to deduplicate by userId
          const userMap = new Map<string, PresenceUser>()

          Object.entries(state).forEach(([, presences]: [string, unknown]) => {
            const presenceArray = presences as Array<{
              userId: string
              userName: string
              avatarUrl?: string
              projectId: string
              fileName?: string
              color: string
            }>

            if (presenceArray && presenceArray.length > 0) {
              const presence = presenceArray[0]
              if (presence.userId && presence.userName) {
                // Only keep one entry per userId (the latest one)
                userMap.set(presence.userId, {
                  userId: presence.userId,
                  userName: presence.userName,
                  avatarUrl: presence.avatarUrl,
                  projectId: projectId, // Use the channel's projectId for consistency
                  fileName: presence.fileName,
                  color: presence.color
                })
              }
            }
          })

          // Convert Map values to array
          const uniqueUsers = Array.from(userMap.values())

          console.log('[MultiPresence] Users for project', projectId, ':', uniqueUsers.length, 'unique users')
          this.usersByProject.set(projectId, uniqueUsers)
          this.notify()
        })

        // Actually subscribe to the channel
        const subscription = await channel.subscribe((status) => {
          console.log('[MultiPresence] Subscribe status for', projectId, ':', status)
          if (status === 'SUBSCRIBED') {
            console.log('[MultiPresence] Successfully subscribed to project:', projectId)
            // Only store the channel after successful subscription
            this.channels.set(projectId, channel)
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[MultiPresence] Failed to subscribe to project:', projectId)
          }
        })

        console.log('[MultiPresence] Subscription result for', projectId, ':', subscription)
      } catch (error) {
        console.error('[MultiPresence] Error subscribing to project:', projectId, error)
      }
    }

    this.notify()
  }

  async cleanup() {
    for (const channel of this.channels.values()) {
      await channel.unsubscribe()
    }
    this.channels.clear()
    this.usersByProject.clear()
  }
}

const multiPresenceManager = new MultiProjectPresenceManager()

export function useMultiProjectPresence(projectIds: string[]) {
  const [users, setUsers] = useState<PresenceUser[]>(multiPresenceManager.getUsers())

  useEffect(() => {
    const unsubscribe = multiPresenceManager.subscribe(() => {
      const allUsers = multiPresenceManager.getUsers()
      console.log('[useMultiProjectPresence] Got users update:', allUsers.length, 'users', allUsers)
      setUsers(allUsers)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    console.log('[useMultiProjectPresence] Subscribing to projects:', projectIds)
    // Call async function properly
    const subscribe = async () => {
      await multiPresenceManager.subscribeToProjects(projectIds)
    }
    subscribe()

    // Cleanup on unmount
    return () => {
      // Optionally cleanup when component unmounts
    }
  }, [projectIds])

  return { users }
}