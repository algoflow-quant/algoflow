import { useEffect, useState, useRef, useMemo } from 'react'
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

// Global presence manager - single instance for the whole app
class GlobalPresenceManager {
  private channels = new Map<string, RealtimeChannel>()
  private supabase = createClient()
  private presenceByProject = new Map<string, Map<string, PresenceUser>>()
  private listeners = new Set<() => void>()
  private myInfo: { userId: string; userName: string; avatarUrl?: string; color: string } | null = null
  private currentProject: string | null = null
  private currentFile: string | null = null

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  notify() {
    this.listeners.forEach(listener => listener())
  }

  async init() {
    if (this.myInfo) return // Already initialized

    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', user.id)
      .single()

    if (!profile) return

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
    const color = colors[user.id.charCodeAt(0) % colors.length]

    this.myInfo = {
      userId: user.id,
      userName: profile.name || 'Unknown User',
      avatarUrl: profile.avatar_url,
      color
    }
  }

  async subscribeToProject(projectId: string) {
    if (!projectId || this.channels.has(projectId)) {
      console.log('[GlobalPresenceManager] subscribeToProject skipped:', { projectId, alreadySubscribed: this.channels.has(projectId) })
      return
    }

    console.log('[GlobalPresenceManager] Subscribing to project:', projectId)

    await this.init()
    if (!this.myInfo) {
      console.log('[GlobalPresenceManager] No myInfo, cannot subscribe')
      return
    }

    // Create a channel for this specific project
    const channel = this.supabase.channel(`project-presence:${projectId}`, {
      config: {
        presence: {
          key: this.myInfo.userId,
        },
      },
    })

    // Initialize presence map for this project
    if (!this.presenceByProject.has(projectId)) {
      this.presenceByProject.set(projectId, new Map())
    }

    channel
      .on('presence', { event: 'sync' }, () => {
        console.log('[GlobalPresenceManager] Presence sync for project:', projectId)
        const state = channel.presenceState()
        const projectPresence = new Map<string, PresenceUser>()

        Object.entries(state).forEach(([userId, presences]) => {
          if (Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as unknown as {
              userId: string
              userName: string
              avatarUrl?: string
              projectId: string
              fileName?: string
              color: string
            }
            // IMPORTANT: Only add users who are actually tracking this specific project
            // Check that their projectId matches the channel's project
            if (presence && presence.userId && presence.projectId === projectId) {
              projectPresence.set(userId, {
                userId: presence.userId,
                userName: presence.userName || 'Unknown',
                avatarUrl: presence.avatarUrl,
                projectId: projectId,
                fileName: presence.fileName,
                color: presence.color || '#4ECDC4'
              })
            }
          }
        })

        console.log('[GlobalPresenceManager] Synced users for project', projectId, ':', projectPresence.size)
        this.presenceByProject.set(projectId, projectPresence)
        this.notify()
      })

    await channel.subscribe()
    console.log('[GlobalPresenceManager] Channel subscribed for project:', projectId)
    this.channels.set(projectId, channel)

    // If this is our current project, track our presence
    if (projectId === this.currentProject) {
      console.log('[GlobalPresenceManager] This is current project, updating presence')
      this.updateMyPresence()
    }
  }

  async unsubscribeFromProject(projectId: string) {
    const channel = this.channels.get(projectId)
    if (channel) {
      await channel.untrack()
      await channel.unsubscribe()
      this.channels.delete(projectId)
      this.presenceByProject.delete(projectId)
    }
  }

  async setCurrentLocation(projectId: string | null, fileName?: string) {
    await this.init()
    if (!this.myInfo) {
      console.log('[GlobalPresenceManager] No myInfo, returning')
      return
    }

    console.log('[GlobalPresenceManager] setCurrentLocation called:', { projectId, fileName, currentProject: this.currentProject })

    // Check if location actually changed
    const locationChanged = this.currentProject !== projectId || this.currentFile !== fileName
    if (!locationChanged) {
      // Location unchanged, but still send a heartbeat to keep presence alive
      // Don't log this to reduce console noise
      return // No change, don't update
    }

    const previousProject = this.currentProject

    console.log('[GlobalPresenceManager] Location changed from', previousProject, 'to', projectId)

    // When switching projects (not just files), untrack from the OLD project channel only
    if (previousProject && previousProject !== projectId) {
      const oldChannel = this.channels.get(previousProject)
      if (oldChannel) {
        console.log('[GlobalPresenceManager] Untracking from old project:', previousProject)
        await oldChannel.untrack()
      }
    }

    // Update current location AFTER untracking to avoid race conditions
    this.currentProject = projectId
    this.currentFile = fileName || null

    // Track on new project (or update file in current project)
    if (projectId) {
      console.log('[GlobalPresenceManager] Updating presence for project:', projectId)
      await this.updateMyPresence()
    } else {
      console.log('[GlobalPresenceManager] No projectId to track')
    }
  }

  async heartbeat() {
    // Just update the presence timestamp without changing location
    if (!this.myInfo || !this.currentProject) return

    const channel = this.channels.get(this.currentProject)
    if (!channel) return

    const presenceData = {
      userId: this.myInfo.userId,
      userName: this.myInfo.userName,
      avatarUrl: this.myInfo.avatarUrl,
      projectId: this.currentProject,
      fileName: this.currentFile,
      color: this.myInfo.color,
      online_at: new Date().toISOString(),
    }

    await channel.track(presenceData)
    // Don't log heartbeats to reduce noise
  }

  private async updateMyPresence() {
    if (!this.myInfo || !this.currentProject) {
      console.log('[GlobalPresenceManager] updateMyPresence skipped:', { hasInfo: !!this.myInfo, currentProject: this.currentProject })
      return
    }

    console.log('[GlobalPresenceManager] updateMyPresence called for:', this.currentProject)

    const channel = this.channels.get(this.currentProject)
    if (!channel) {
      // Not subscribed to this project yet, subscribe first
      console.log('[GlobalPresenceManager] Channel not found, subscribing to:', this.currentProject)
      await this.subscribeToProject(this.currentProject)
      return
    }

    const presenceData = {
      userId: this.myInfo.userId,
      userName: this.myInfo.userName,
      avatarUrl: this.myInfo.avatarUrl,
      projectId: this.currentProject,
      fileName: this.currentFile,
      color: this.myInfo.color,
      online_at: new Date().toISOString(),
    }

    console.log('[GlobalPresenceManager] Tracking presence:', presenceData)
    await channel.track(presenceData)
  }

  getAllUsers(): PresenceUser[] {
    const allUsers: PresenceUser[] = []
    this.presenceByProject.forEach((projectPresence) => {
      projectPresence.forEach(user => {
        allUsers.push(user)
      })
    })
    return allUsers
  }

  getUsersForProject(projectId: string): PresenceUser[] {
    const projectPresence = this.presenceByProject.get(projectId)
    return projectPresence ? Array.from(projectPresence.values()) : []
  }

  getFileUsersMap(currentProjectId?: string): Map<string, PresenceUser[]> {
    const map = new Map<string, PresenceUser[]>()

    // Only get file users for the current project, not all projects
    const projectId = currentProjectId || this.currentProject
    if (!projectId) return map

    const projectPresence = this.presenceByProject.get(projectId)
    if (!projectPresence) return map

    projectPresence.forEach(user => {
      if (user.fileName) {
        if (!map.has(user.fileName)) {
          map.set(user.fileName, [])
        }
        const users = map.get(user.fileName)!
        if (!users.find(u => u.userId === user.userId)) {
          users.push(user)
        }
      }
    })

    return map
  }
}

// Single global instance
const globalPresenceManager = new GlobalPresenceManager()

// Hook for components to use presence
export function useProjectPresence(currentProjectId: string | null, currentFileName?: string) {
  const [allUsers, setAllUsers] = useState<PresenceUser[]>([])
  const [fileUsersMap, setFileUsersMap] = useState<Map<string, PresenceUser[]>>(new Map())

  // Subscribe to presence updates
  useEffect(() => {
    const unsubscribe = globalPresenceManager.subscribe(() => {
      setAllUsers(globalPresenceManager.getAllUsers())
      setFileUsersMap(globalPresenceManager.getFileUsersMap(currentProjectId || undefined))
    })
    // Set initial state
    setAllUsers(globalPresenceManager.getAllUsers())
    setFileUsersMap(globalPresenceManager.getFileUsersMap(currentProjectId || undefined))
    return unsubscribe
  }, [currentProjectId])

  // Update current location
  useEffect(() => {
    // Only update location AND set up heartbeat if we have both projectId and filename
    // When either is missing, this component is not actively tracking (e.g., inactive tab or wrong project)
    if (!currentProjectId || !currentFileName) {
      return // Don't track, don't set up heartbeat
    }

    globalPresenceManager.setCurrentLocation(currentProjectId, currentFileName)

    // Set up heartbeat (just to keep presence alive, not change location)
    const interval = setInterval(() => {
      globalPresenceManager.heartbeat()
    }, 10000)

    return () => clearInterval(interval)
  }, [currentProjectId, currentFileName])

  // Get project-specific users
  const projectUsers = useMemo(() => {
    return allUsers.filter(u => u.projectId)
  }, [allUsers])

  return {
    allUsers,
    projectUsers,
    fileUsersMap
  }
}

// Hook specifically for the sidebar to subscribe to ALL projects
export function useSidebarPresence(projectIds: string[]) {
  const [usersByProject, setUsersByProject] = useState<Map<string, PresenceUser[]>>(new Map())

  // Subscribe to all projects
  useEffect(() => {
    projectIds.forEach(projectId => {
      globalPresenceManager.subscribeToProject(projectId)
    })

    const unsubscribe = globalPresenceManager.subscribe(() => {
      const newUsersByProject = new Map<string, PresenceUser[]>()
      projectIds.forEach(projectId => {
        const users = globalPresenceManager.getUsersForProject(projectId)
        if (users.length > 0) {
          newUsersByProject.set(projectId, users)
        }
      })
      setUsersByProject(newUsersByProject)
    })

    return () => {
      unsubscribe()
      // Note: We don't unsubscribe from projects here to keep them cached
    }
  }, [projectIds.join(',')]) // Use string comparison to avoid re-runs

  return { usersByProject }
}

// Hook for reading presence data WITHOUT changing the user's current location
// Use this when you only want to display who's online, not track your own presence
export function usePresenceData() {
  const [allUsers, setAllUsers] = useState<PresenceUser[]>([])

  // Subscribe to presence updates (read-only, doesn't change location)
  useEffect(() => {
    const unsubscribe = globalPresenceManager.subscribe(() => {
      setAllUsers(globalPresenceManager.getAllUsers())
    })
    // Set initial state
    setAllUsers(globalPresenceManager.getAllUsers())
    return unsubscribe
  }, [])

  return { allUsers }
}