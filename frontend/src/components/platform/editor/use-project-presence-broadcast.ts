import { useEffect, useState, useRef, useMemo } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface ProjectUser {
  userId: string
  userName: string
  avatarUrl?: string
  color: string
  projectId: string
  fileName?: string
  sessionId: string
  lastActive: number
}

// Generate a unique session ID per browser tab/window
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Global store for managing project presence across components
class ProjectPresenceBroadcast {
  private usersByProject = new Map<string, ProjectUser[]>()
  private listeners = new Set<() => void>()
  private channels = new Map<string, RealtimeChannel>()
  private supabase = createClient()

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getAllUsers(): ProjectUser[] {
    const allUsers: ProjectUser[] = []
    this.usersByProject.forEach(users => {
      allUsers.push(...users)
    })
    return allUsers
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }

  async subscribeToProjects(projectIds: string[]) {
    console.log('[ProjectPresence] Subscribing to projects:', projectIds)

    // Unsubscribe from projects no longer in list
    for (const [projectId, channel] of this.channels.entries()) {
      if (!projectIds.includes(projectId)) {
        console.log('[ProjectPresence] Unsubscribing from:', projectId)

        // Send leave broadcast before unsubscribing
        await channel.send({
          type: 'broadcast',
          event: 'project-presence',
          payload: {
            sessionId: SESSION_ID,
            userId: null, // null means user left
            projectId
          }
        })

        await channel.unsubscribe()
        this.channels.delete(projectId)
        this.usersByProject.delete(projectId)
      }
    }

    // Subscribe to new projects
    for (const projectId of projectIds) {
      if (!projectId || this.channels.has(projectId)) continue

      console.log('[ProjectPresence] Creating channel for:', projectId)
      const channel = this.supabase.channel(`project:${projectId}:presence`)

      channel
        .on('broadcast', { event: 'project-presence' }, ({ payload }) => {
          // Ignore our own broadcasts (same session)
          if (payload.sessionId === SESSION_ID) {
            return
          }

          console.log('[ProjectPresence] Received presence update:', payload)

          // Update users for this project
          const currentUsers = this.usersByProject.get(projectId) || []

          // Filter out all presence from this user (across all sessions)
          const filtered = currentUsers.filter(u => u.userId !== payload.userId)

          if (!payload.userId) {
            // User left the project
            this.usersByProject.set(projectId, filtered)
          } else {
            // User joined or updated presence
            const newUser: ProjectUser = {
              userId: payload.userId,
              userName: payload.userName || 'Unknown User',
              avatarUrl: payload.avatarUrl,
              color: payload.color || '#4ECDC4',
              projectId: projectId,
              fileName: payload.fileName,
              sessionId: payload.sessionId,
              lastActive: Date.now()
            }
            this.usersByProject.set(projectId, [...filtered, newUser])
          }

          this.notify()
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[ProjectPresence] Subscribed to:', projectId)
            this.channels.set(projectId, channel)
          }
        })
    }
  }

  async broadcastPresence(projectId: string, userId: string, userName: string, avatarUrl?: string, fileName?: string) {
    // First ensure we're subscribed to this project
    if (!this.channels.has(projectId)) {
      console.log('[ProjectPresence] Need to subscribe first for project:', projectId)
      await this.subscribeToProjects([projectId])
      // Wait a moment for subscription to complete
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const channel = this.channels.get(projectId)
    if (!channel) {
      console.log('[ProjectPresence] No channel for project:', projectId)
      return
    }

    // Generate a color for this user
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
    const color = colors[userId.charCodeAt(0) % colors.length]

    console.log('[ProjectPresence] Broadcasting presence for user:', userName, 'in project:', projectId)
    await channel.send({
      type: 'broadcast',
      event: 'project-presence',
      payload: {
        sessionId: SESSION_ID,
        userId,
        userName,
        avatarUrl,
        color,
        projectId,
        fileName
      }
    })
  }

  async broadcastLeave(projectId: string) {
    const channel = this.channels.get(projectId)
    if (!channel) return

    await channel.send({
      type: 'broadcast',
      event: 'project-presence',
      payload: {
        sessionId: SESSION_ID,
        userId: null, // null means leaving
        projectId
      }
    })
  }

  cleanup() {
    // Send leave broadcasts for all channels
    this.channels.forEach(async (channel, projectId) => {
      await this.broadcastLeave(projectId)
      await channel.unsubscribe()
    })
    this.channels.clear()
    this.usersByProject.clear()
  }
}

const projectPresenceBroadcast = new ProjectPresenceBroadcast()

// Hook for sidebar to show presence for all projects
export function useProjectPresenceBroadcast(projectIds: string[]) {
  const [users, setUsers] = useState<ProjectUser[]>([])

  useEffect(() => {
    const unsubscribe = projectPresenceBroadcast.subscribe(() => {
      const allUsers = projectPresenceBroadcast.getAllUsers()
      console.log('[useProjectPresence] Updated users:', allUsers.length, 'users', allUsers)
      setUsers(allUsers)
    })

    // Get initial state
    const initialUsers = projectPresenceBroadcast.getAllUsers()
    if (initialUsers.length > 0) {
      console.log('[useProjectPresence] Initial users:', initialUsers.length, 'users', initialUsers)
      setUsers(initialUsers)
    }

    return unsubscribe
  }, [])

  useEffect(() => {
    if (projectIds.length > 0) {
      console.log('[useProjectPresence] Subscribing to projects:', projectIds)
      projectPresenceBroadcast.subscribeToProjects(projectIds)
    }
  }, [projectIds])

  return { users }
}

// Hook for broadcasting presence when on a project
export function useBroadcastProjectPresence(projectId: string | null, fileName?: string) {
  const userRef = useRef<{ id: string; name: string; avatarUrl?: string } | null>(null)

  useEffect(() => {
    if (!projectId) return

    const setupPresence = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()

      userRef.current = {
        id: user.id,
        name: profile?.name || 'Unknown User',
        avatarUrl: profile?.avatar_url
      }

      // Broadcast initial presence
      await projectPresenceBroadcast.broadcastPresence(
        projectId,
        user.id,
        userRef.current.name,
        userRef.current.avatarUrl,
        fileName
      )
    }

    setupPresence()

    return () => {
      // Broadcast leave when component unmounts
      if (projectId) {
        projectPresenceBroadcast.broadcastLeave(projectId)
      }
    }
  }, [projectId, fileName])
}