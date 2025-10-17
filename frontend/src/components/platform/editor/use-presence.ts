'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PresenceUser {
  userId: string
  userName: string
  avatarUrl?: string
  projectId?: string
  fileName?: string
  color: string
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']

// Global state manager for presence - shared across all hook instances
class PresenceManager {
  private usersByProject = new Map<string, PresenceUser[]>()
  private listeners = new Set<() => void>()
  private channels = new Map<string, RealtimeChannel>()
  private currentProjectId: string | null = null

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getUsers(): PresenceUser[] {
    // Combine all users from all projects into a single array
    const allUsers: PresenceUser[] = []
    this.usersByProject.forEach(users => {
      allUsers.push(...users)
    })
    return allUsers
  }

  setProjectUsers(projectId: string, users: PresenceUser[]) {
    this.usersByProject.set(projectId, users)
    this.notify()
  }

  clearProjectUsers(projectId: string) {
    this.usersByProject.delete(projectId)
    this.notify()
  }

  switchToProject(newProjectId: string) {
    // Clean up old project if switching
    if (this.currentProjectId && this.currentProjectId !== newProjectId) {
      console.log('[PresenceManager] Switching from project', this.currentProjectId, 'to', newProjectId)
      const oldChannel = this.channels.get(this.currentProjectId)
      if (oldChannel) {
        console.log('[PresenceManager] Unsubscribing from old project channel:', this.currentProjectId)
        oldChannel.unsubscribe()
        this.channels.delete(this.currentProjectId)
      }
      this.clearProjectUsers(this.currentProjectId)
    }
    this.currentProjectId = newProjectId
  }

  getChannel(projectId: string): RealtimeChannel | undefined {
    return this.channels.get(projectId)
  }

  setChannel(projectId: string, channel: RealtimeChannel) {
    this.channels.set(projectId, channel)
  }

  removeChannel(projectId: string) {
    this.channels.delete(projectId)
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }
}

const presenceManager = new PresenceManager()

export function usePresence(projectId: string, fileName?: string, trackPresence = true) {
  const [users, setUsers] = useState<PresenceUser[]>(presenceManager.getUsers())
  const [myColor] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const currentPresenceKeyRef = useRef<string | null>(null)
  const lastProjectIdRef = useRef<string | null>(null)

  // Subscribe to global presence state changes
  useEffect(() => {
    const unsubscribe = presenceManager.subscribe(() => {
      setUsers(presenceManager.getUsers())
    })
    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!projectId) return

    // If trackPresence is false, we still want to read global state but not track
    // The subscription to global state is already set up in the earlier useEffect
    if (!trackPresence) {
      console.log('[Presence] Read-only mode for project:', projectId)
      return
    }

    const supabase = createClient()
    // Always use the same project channel - everyone joins the same room
    const channelName = `presence:project:${projectId}`

    console.log('[Presence] Setting up channel:', channelName, 'for file:', fileName || 'none')

    // Only switch projects if this hook instance is changing projects
    // This prevents multiple hook instances from fighting over the global state
    if (lastProjectIdRef.current !== projectId) {
      console.log('[Presence] Hook instance switching from project', lastProjectIdRef.current, 'to', projectId)
      presenceManager.switchToProject(projectId)
      lastProjectIdRef.current = projectId
    }

    // Get current user info
    const setupPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('[Presence] No user found, skipping setup')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()

      // Check if channel already exists for this project
      const existingChannel = presenceManager.getChannel(projectId)
      if (existingChannel) {
        console.log('[Presence] Reusing existing channel for project:', projectId)
        channelRef.current = existingChannel

        // Untrack old presence if it exists
        if (currentPresenceKeyRef.current) {
          console.log('[Presence] Untracking old presence:', currentPresenceKeyRef.current)
          await channelRef.current.untrack()
        }

        // Create new presence key
        const presenceKey = fileName
          ? `${user.id}:${fileName}:${Date.now()}`
          : `${user.id}:global:${Date.now()}`

        currentPresenceKeyRef.current = presenceKey

        await channelRef.current.track({
          userId: user.id,
          userName: profile?.name || 'Anonymous',
          avatarUrl: profile?.avatar_url,
          projectId,
          fileName,
          color: myColor
        })
        return
      }

      // Clean up existing channel ref if any
      if (channelRef.current) {
        console.log('[Presence] Cleaning up existing channel')
        await channelRef.current.unsubscribe()
        channelRef.current = null
      }

      // Create unique presence key per instance
      // Include timestamp to allow multiple tabs of same user on same file
      const presenceKey = fileName
        ? `${user.id}:${fileName}:${Date.now()}`
        : `${user.id}:global:${Date.now()}`

      currentPresenceKeyRef.current = presenceKey

      channelRef.current = supabase.channel(channelName, {
        config: {
          presence: {
            key: presenceKey
          }
        }
      })

      channelRef.current
        .on('presence', { event: 'sync' }, () => {
          if (!channelRef.current) return

          const state = channelRef.current.presenceState()
          console.log('[Presence] Sync event, channel:', channelName, 'raw state:', state)
          const presenceUsers: PresenceUser[] = []

          Object.entries(state).forEach(([key, presences]: [string, unknown]) => {
            console.log('[Presence] Processing key:', key, 'presences:', presences)
            const presenceArray = presences as Array<{
              userId: string
              userName: string
              avatarUrl?: string
              projectId?: string
              fileName?: string
              color: string
            }>
            presenceArray.forEach((presence) => {
              console.log('[Presence] Adding user:', presence.userName, 'file:', presence.fileName)
              presenceUsers.push({
                userId: presence.userId,
                userName: presence.userName,
                avatarUrl: presence.avatarUrl,
                projectId: presence.projectId,
                fileName: presence.fileName,
                color: presence.color
              })
            })
          })

          console.log('[Presence] Final users for', channelName, ':', presenceUsers.length, 'users')
          // Update this project's users in global state - doesn't affect other projects
          presenceManager.setProjectUsers(projectId, presenceUsers)
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[Presence] User joined channel', channelName, ':', key, newPresences)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[Presence] User left channel', channelName, ':', key, leftPresences)
        })
        .subscribe(async (status) => {
          console.log('[Presence] Subscription status for', channelName, ':', status)
          if (status === 'SUBSCRIBED' && channelRef.current) {
            console.log('[Presence] Tracking presence for user:', user.id, 'project:', projectId, 'file:', fileName)
            await channelRef.current.track({
              userId: user.id,
              userName: profile?.name || 'Unknown User',
              avatarUrl: profile?.avatar_url,
              projectId,
              fileName,
              color: myColor,
              online_at: new Date().toISOString()
            })
          }
        })

      // Store channel in global manager
      presenceManager.setChannel(projectId, channelRef.current)
    }

    setupPresence()

    return () => {
      console.log('[Presence] Cleanup for channel:', channelName)
      // Always untrack presence on cleanup to prevent ghost users
      if (channelRef.current) {
        console.log('[Presence] Untracking presence on cleanup')
        channelRef.current.untrack()
      }
      channelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, fileName, trackPresence]) // myColor is stable and doesn't need to be in deps

  // Filter users by context - use useMemo to ensure stable references
  const projectUsers = useMemo(() => {
    const filtered = users.filter(u => u.projectId === projectId)
    console.log('[Presence] Computed projectUsers:', filtered.length, 'from', users.length, 'total users')
    return filtered
  }, [users, projectId])

  // Create a map of fileName -> users editing that file
  const fileUsersMap = useMemo(() => {
    const map: Record<string, PresenceUser[]> = {}
    users.forEach(u => {
      if (u.fileName && u.projectId === projectId) {
        if (!map[u.fileName]) {
          map[u.fileName] = []
        }
        map[u.fileName].push(u)
      }
    })
    console.log('[Presence] Computed fileUsersMap:', Object.keys(map).length, 'files')
    return map
  }, [users, projectId])

  return {
    allUsers: users,
    projectUsers,
    fileUsers: fileUsersMap,
    myColor
  }
}
