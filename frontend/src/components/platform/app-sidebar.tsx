"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import {
  IconBook,
  IconSchool,
  IconFileText,
  IconChevronDown,
  IconPlus,
  IconChartBar,
  IconSettings,
  IconArrowLeft,
  IconDotsVertical,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"

import { NavUser } from "@/components/layout/nav-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getUserTeams, getTeamProjects, createTeam, createProject, updateTeam, deleteTeam, updateProject, deleteProject, isTeamOwner, canModifyProjectSync, type Team, type Project } from "@/lib/api/teams"
import { createClient } from "@/lib/supabase/client"
import { CreateTeamDialog } from "@/components/platform/team/create-team-dialog"
import { CreateProjectDialog } from "@/components/platform/project/create-project-dialog"
import { RenameTeamDialog } from "@/components/platform/team/rename-team-dialog"
import { RenameProjectDialog } from "@/components/platform/project/rename-project-dialog"
import { TeamMembersSection } from "@/components/platform/team/team-members-section"
import { TeamSettingsDialog } from "@/components/platform/team/team-settings-dialog"
import { UserAvatars } from "@/components/platform/editor/user-avatars"
import { useSidebarPresence, useProjectPresence } from "@/components/platform/editor/use-project-presence"

// Project menu item with presence avatars
function ProjectMenuItem({
  project,
  selectedTeam,
  isActive,
  user,
  isOwner,
  onRename,
  onDelete,
  projectUsers
}: {
  project: Project
  selectedTeam: Team | null
  isActive: boolean
  user?: User
  isOwner: boolean
  onRename: () => void
  onDelete: () => void
  projectUsers: Array<{
    userId: string
    userName: string
    avatarUrl?: string
    projectId?: string
    fileName?: string
    color: string
  }>
}) {
  const [showUsersList, setShowUsersList] = React.useState(false)

  return (
    <SidebarMenuSubItem>
      <div className="flex items-center gap-1 group">
        <SidebarMenuSubButton asChild className="flex-1">
          <Link
            href={`/lab/${selectedTeam?.id}/${project.id}`}
            className={isActive ? "bg-brand-blue/10 text-brand-blue font-semibold" : ""}
          >
            <span className="flex-1">{project.name}</span>
            {projectUsers.length > 0 && (
              <div onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowUsersList(true)
              }}>
                <UserAvatars users={projectUsers} size="sm" max={3} />
              </div>
            )}
          </Link>
        </SidebarMenuSubButton>

        {/* Project Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded hover:bg-brand-blue/10 transition-all">
              <IconDotsVertical className="!size-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onRename}
              disabled={!canModifyProjectSync(project, user?.id || '', isOwner)}
            >
              <IconPencil className="mr-2 !size-4" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              disabled={!canModifyProjectSync(project, user?.id || '', isOwner)}
              className="text-destructive"
            >
              <IconTrash className="mr-2 !size-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Users List Dialog */}
      <Dialog open={showUsersList} onOpenChange={setShowUsersList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Active Users - {project.name}</DialogTitle>
            <DialogDescription>
              {projectUsers.length} {projectUsers.length === 1 ? 'user' : 'users'} currently working on this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {projectUsers.map((user, index) => (
              <div
                key={`${user.userId}-${index}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: user.color }}
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.userName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    user.userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{user.userName}</p>
                  {user.fileName && (
                    <p className="text-sm text-muted-foreground">Editing: {user.fileName}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarMenuSubItem>
  )
}

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: User }) {
  const router = useRouter()
  const pathname = usePathname()
  const [teams, setTeams] = React.useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCreateTeam, setShowCreateTeam] = React.useState(false)
  const [showCreateProject, setShowCreateProject] = React.useState(false)

  // Extract current project ID from URL pathname (e.g., /lab/teamId/projectId)
  const currentProjectId = React.useMemo(() => {
    const parts = pathname?.split('/') || []
    const projectId = parts.length >= 4 ? parts[3] : null
    console.log('[Sidebar] Current project ID from pathname:', projectId, 'pathname:', pathname)
    return projectId
  }, [pathname])

  // Get all project IDs to subscribe to, plus a global presence channel
  const projectIds = React.useMemo(() => {
    const ids = projects?.map(p => p.id) || []
    // Add global presence channel to track all online users
    return ['global-presence', ...ids]
  }, [projects])

  // Subscribe to presence for ALL projects (including global)
  const { usersByProject } = useSidebarPresence(projectIds)

  // Track our own presence on the current project (or just track globally if no project)
  // This ensures users show as "online" even when just browsing the app
  const presenceProjectId = currentProjectId || 'global-presence'
  console.log('[Sidebar] Calling useProjectPresence with:', presenceProjectId, 'currentProjectId:', currentProjectId)
  useProjectPresence(presenceProjectId)
  const [showRenameTeam, setShowRenameTeam] = React.useState(false)
  const [showTeamSettings, setShowTeamSettings] = React.useState(false)
  const [showRenameProject, setShowRenameProject] = React.useState<string | null>(null)
  const [isOwner, setIsOwner] = React.useState(false)

  // Fetch teams on mount
  React.useEffect(() => {
    async function fetchTeams() {
      try {
        const userTeams = await getUserTeams()
        setTeams(userTeams)
      } catch (error) {
        console.error('Error fetching teams:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()

    // Listen for team creation events
    const handleTeamCreated = () => {
      fetchTeams()
    }

    // Listen for when user gets kicked from a team
    const handleUserKicked = (event: Event) => {
      const customEvent = event as CustomEvent<{ teamId: string }>
      const kickedTeamId = customEvent.detail.teamId
      console.log('[Sidebar] User was kicked from team:', kickedTeamId)
      console.log('[Sidebar] Current selectedTeam:', selectedTeam?.id, selectedTeam?.name)

      // IMMEDIATELY clear everything if it matches the kicked team
      if (selectedTeam?.id === kickedTeamId) {
        console.log('[Sidebar] Clearing selected team and projects IMMEDIATELY')
        setSelectedTeam(null)
        setProjects([]) // Clear projects immediately
        setIsOwner(false) // Clear owner status
      }

      // Remove team from list
      setTeams(prev => {
        const remainingTeams = prev.filter(t => t.id !== kickedTeamId)
        console.log('[Sidebar] Teams after kick:', remainingTeams.map(t => t.name))

        // Redirect after clearing
        setTimeout(() => {
          if (remainingTeams.length === 0) {
            console.log('[Sidebar] No teams left, going to /lab')
            router.push('/lab')
            router.refresh()
          } else {
            console.log('[Sidebar] Going to first team:', remainingTeams[0].name)
            router.push(`/lab/${remainingTeams[0].id}`)
          }
        }, 100)

        return remainingTeams
      })
    }

    window.addEventListener('teamCreated', handleTeamCreated)
    window.addEventListener('userKickedFromTeam', handleUserKicked as EventListener)

    return () => {
      window.removeEventListener('teamCreated', handleTeamCreated)
      window.removeEventListener('userKickedFromTeam', handleUserKicked as EventListener)
    }
  }, [selectedTeam, router])

  // Real-time subscriptions for teams
  React.useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()

    // Subscribe to teams changes
    const teamsChannel = supabase
      .channel(`teams-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        async (payload) => {
          console.log('[Teams] Change detected:', payload)

          if (payload.eventType === 'INSERT') {
            const newTeam = payload.new as Team
            console.log('[Teams] New team created:', newTeam.name)
            // Check if team already exists (avoid duplicates from local creation)
            setTeams(prev => {
              if (prev.some(t => t.id === newTeam.id)) {
                return prev
              }
              return [...prev, newTeam]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedTeam = payload.new as Team
            console.log('[Teams] Team updated:', updatedTeam.name, '- avatar_url:', updatedTeam.avatar_url)
            setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t))
            // Update selected team if it's the one that changed (includes avatar updates)
            setSelectedTeam(prev => prev?.id === updatedTeam.id ? updatedTeam : prev)
          } else if (payload.eventType === 'DELETE') {
            const deletedTeam = payload.old as Team
            console.log('[Teams] Team deleted:', deletedTeam.id)
            setTeams(prev => prev.filter(t => t.id !== deletedTeam.id))
            // Clear selected team if it was deleted
            if (selectedTeam?.id === deletedTeam.id) {
              setSelectedTeam(null)
              router.push('/lab')
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Teams] Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[Teams] Successfully subscribed to teams')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Teams] Channel error - realtime not enabled on teams table')
        } else if (status === 'TIMED_OUT') {
          console.error('[Teams] Subscription timed out')
        } else if (status === 'CLOSED') {
          console.log('[Teams] Channel closed')
        }
      })

    // Subscribe to team_members changes (for when user joins OR gets kicked from a team)
    // NOTE: We don't use filter on DELETE because Supabase may not include the filtered column in payload.old
    const teamMembersChannel = supabase
      .channel(`team-members-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        async (payload) => {
          console.log('[TeamMembers] RAW EVENT:', payload.eventType, 'Full payload:', JSON.stringify(payload))

          if (payload.eventType === 'INSERT') {
            const newMember = payload.new as { user_id: string }
            // Only process if it's for this user
            if (newMember.user_id === user.id) {
              console.log('[TeamMembers] User joined a new team, refreshing teams list')
              const userTeams = await getUserTeams()
              setTeams(userTeams)
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedMember = payload.old as { team_id: string, user_id: string }
            console.log('[TeamMembers] DELETE event - team_id:', deletedMember.team_id, 'user_id:', deletedMember.user_id, 'current user:', user.id)

            // Only process if it's for this user
            if (deletedMember.user_id === user.id) {
              console.log('[TeamMembers] THIS USER was removed from team:', deletedMember.team_id)
              console.log('[TeamMembers] Current selected team:', selectedTeam?.id, selectedTeam?.name)

              // Update teams list first using functional update
              setTeams(prev => {
                console.log('[TeamMembers] Current teams in state:', prev.map(t => ({ id: t.id, name: t.name })))
                const remainingTeams = prev.filter(t => t.id !== deletedMember.team_id)
                console.log('[TeamMembers] Remaining teams after filter:', remainingTeams.map(t => ({ id: t.id, name: t.name })))

                // Clear selected team and redirect AFTER updating teams state
                setTimeout(() => {
                  console.log('[TeamMembers] Clearing selected team and redirecting')
                  setSelectedTeam(null)

                  if (remainingTeams.length === 0) {
                    console.log('[TeamMembers] No teams left, going to /lab')
                    router.push('/lab')
                    router.refresh()
                  } else {
                    console.log('[TeamMembers] Going to first team:', remainingTeams[0].id, remainingTeams[0].name)
                    router.push(`/lab/${remainingTeams[0].id}`)
                  }
                }, 0)

                return remainingTeams
              })
            } else {
              console.log('[TeamMembers] DELETE was for different user, ignoring')
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[TeamMembers] Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[TeamMembers] Successfully subscribed to team_members for user')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[TeamMembers] Channel error - realtime not enabled on team_members table')
        } else if (status === 'TIMED_OUT') {
          console.error('[TeamMembers] Subscription timed out')
        } else if (status === 'CLOSED') {
          console.log('[TeamMembers] Channel closed')
        }
      })

    return () => {
      supabase.removeChannel(teamsChannel)
      supabase.removeChannel(teamMembersChannel)
    }
  }, [user?.id, selectedTeam?.id, selectedTeam?.name, router])

  // Update selected team based on URL
  React.useEffect(() => {
    if (!pathname || teams.length === 0) return

    const match = pathname.match(/^\/lab\/([^/]+)/)
    if (match) {
      const teamId = match[1]
      const team = teams.find((t) => t.id === teamId)
      if (team) {
        setSelectedTeam(team)
      }
    } else {
      setSelectedTeam(null)
    }
  }, [pathname, teams])

  // Fetch projects when selected team changes
  React.useEffect(() => {
    async function fetchProjects() {
      if (!selectedTeam) {
        setProjects([])
        setIsOwner(false)
        return
      }

      try {
        const teamProjects = await getTeamProjects(selectedTeam.id)
        setProjects(teamProjects)
        const ownerStatus = await isTeamOwner(selectedTeam.id)
        setIsOwner(ownerStatus)
      } catch (error) {
        console.error('Error fetching projects:', error)
      }
    }

    fetchProjects()

    // Listen for project creation events
    const handleProjectCreated = () => {
      fetchProjects()
    }

    window.addEventListener('projectCreated', handleProjectCreated)
    return () => window.removeEventListener('projectCreated', handleProjectCreated)
  }, [selectedTeam])

  // Real-time subscriptions for projects - Subscribe to ALL projects, filter by selected team in state
  React.useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()

    // Subscribe to ALL project changes (no team filter - we'll filter in the handler)
    const projectsChannel = supabase
      .channel(`projects-all-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        async (payload) => {
          console.log('[Projects] Change detected:', payload)

          if (payload.eventType === 'INSERT') {
            const newProject = payload.new as Project
            console.log('[Projects] New project added:', newProject.name, 'for team:', newProject.team_id)

            // Only add if it belongs to the currently selected team
            if (selectedTeam?.id === newProject.team_id) {
              setProjects(prev => {
                if (prev.some(p => p.id === newProject.id)) {
                  return prev
                }
                return [...prev, newProject]
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedProject = payload.new as Project
            console.log('[Projects] Project updated:', updatedProject.name)

            // Only update if it belongs to the currently selected team
            if (selectedTeam?.id === updatedProject.team_id) {
              setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p))
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedProject = payload.old as Project
            console.log('[Projects] Project deleted:', deletedProject.id, 'from team:', deletedProject.team_id)
            console.log('[Projects] Current selected team:', selectedTeam?.id)
            console.log('[Projects] Current projects before delete:', projects.map(p => p.id))

            // Remove from projects list if it's currently in there
            setProjects(prev => {
              const filtered = prev.filter(p => p.id !== deletedProject.id)
              console.log('[Projects] Projects after delete:', filtered.map(p => p.id))
              return filtered
            })

            // Navigate away if we're viewing the deleted project
            if (pathname === `/lab/${selectedTeam?.id}/${deletedProject.id}`) {
              console.log('[Projects] Currently viewing deleted project, redirecting...')
              router.push(`/lab/${selectedTeam?.id}`)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Projects] Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[Projects] Successfully subscribed to ALL projects')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Projects] Channel error - realtime not enabled on projects table')
        } else if (status === 'TIMED_OUT') {
          console.error('[Projects] Subscription timed out')
        } else if (status === 'CLOSED') {
          console.log('[Projects] Channel closed')
        }
      })

    return () => {
      supabase.removeChannel(projectsChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedTeam?.id, pathname, router])

  const handleCreateTeam = async (name: string, description?: string) => {
    try {
      const newTeam = await createTeam(name, description)
      setTeams([...teams, newTeam])
      setSelectedTeam(newTeam)
      router.push(`/lab/${newTeam.id}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error) || 'Failed to create team')
      throw error
    }
  }

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team)
    router.push(`/lab/${team.id}`)
  }

  const handleCreateProject = async (name: string, type: string, description?: string) => {
    if (!selectedTeam) return

    try {
      const newProject = await createProject(selectedTeam.id, {
        name,
        description,
        type: type as 'strategy' | 'backtest' | 'research' | 'data_analysis',
      })
      setProjects([...projects, newProject])
      // Navigate to the new project
      router.push(`/lab/${selectedTeam.id}/${newProject.id}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error) || 'Failed to create project')
      throw error
    }
  }

  const handleRenameTeam = async (name: string, description?: string) => {
    if (!selectedTeam) return

    try {
      const updatedTeam = await updateTeam(selectedTeam.id, { name, description })
      setTeams(teams.map(t => t.id === updatedTeam.id ? updatedTeam : t))
      setSelectedTeam(updatedTeam)
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error) || 'Failed to rename team')
      throw error
    }
  }

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return
    if (!confirm(`Are you sure you want to delete "${selectedTeam.name}"? This will also delete all projects in this team.`)) return

    try {
      await deleteTeam(selectedTeam.id)
      setTeams(teams.filter(t => t.id !== selectedTeam.id))
      setSelectedTeam(null)
      router.push('/lab')
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error) || 'Failed to delete team')
    }
  }

  const handleRenameProject = async (projectId: string, name: string, description?: string) => {
    try {
      const updatedProject = await updateProject(projectId, { name, description })
      setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p))
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error) || 'Failed to rename project')
      throw error
    }
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"?`)) return

    try {
      await deleteProject(projectId)
      setProjects(projects.filter(p => p.id !== projectId))
      // If we're currently viewing this project, navigate back to team page
      if (pathname === `/lab/${selectedTeam?.id}/${projectId}`) {
        router.push(`/lab/${selectedTeam?.id}`)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error) || 'Failed to delete project')
    }
  }

  if (loading) {
    return (
      <Sidebar collapsible="icon" {...props} className="border-r-2 border-brand-blue/20 [&_[data-slot=sidebar-inner]]:bg-brand-blue/5">
        <SidebarContent className="flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </SidebarContent>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon" {...props} className="border-r-2 border-brand-blue/20 [&_[data-slot=sidebar-inner]]:bg-brand-blue/5">
      <SidebarHeader className="border-b border-brand-blue/20">
        {/* Back to Homepage */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                <IconArrowLeft className="!size-4" />
                <span>Back to Homepage</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User profile */}
        <NavUser user={user} />
      </SidebarHeader>

      <SidebarContent>
        {/* Team Selector - Profile Style */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              {teams.length === 0 ? (
                <SidebarMenuButton
                  onClick={() => setShowCreateTeam(true)}
                  className="h-auto py-3 hover:bg-brand-blue/10"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                      <IconPlus className="!size-5" />
                    </div>
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate">Create Team</span>
                      <span className="text-xs text-muted-foreground truncate">Get started</span>
                    </div>
                  </div>
                </SidebarMenuButton>
              ) : (
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton className="h-auto py-3 hover:bg-brand-blue/10 flex-1 group-data-[collapsible=icon]:justify-center">
                        <div className="flex items-center gap-3 w-full group-data-[collapsible=icon]:w-auto">
                          {selectedTeam ? (
                            <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
                              <AvatarImage src={selectedTeam.avatar_url || undefined} alt={selectedTeam.name} />
                              <AvatarFallback className="rounded-lg bg-brand-blue/10 text-brand-blue font-semibold text-sm">
                                {selectedTeam.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue font-semibold text-sm flex-shrink-0">
                              <IconPlus className="!size-5" />
                            </div>
                          )}
                          <div className="flex flex-col items-start flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                            <span className="text-sm font-semibold truncate">
                              {selectedTeam?.name || 'Select Team'}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {selectedTeam ? 'Active workspace' : 'Choose a team'}
                            </span>
                          </div>
                          <IconChevronDown className="!size-4 ml-auto flex-shrink-0 group-data-[collapsible=icon]:hidden" />
                        </div>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64" align="start">
                      {teams.map((team) => (
                        <DropdownMenuItem
                          key={team.id}
                          onClick={() => handleTeamSelect(team)}
                          className="flex items-center gap-3 p-3"
                        >
                          <Avatar className="h-8 w-8 rounded-lg flex-shrink-0">
                            <AvatarImage src={team.avatar_url || undefined} alt={team.name} />
                            <AvatarFallback className="rounded-lg bg-brand-blue/10 text-brand-blue font-semibold text-xs">
                              {team.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-medium truncate">{team.name}</span>
                            {team.description && (
                              <span className="text-xs text-muted-foreground truncate">
                                {team.description}
                              </span>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowCreateTeam(true)} className="p-3">
                        <IconPlus className="mr-3 !size-4" />
                        <span>Create New Team</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Team Actions Menu - Only show if team is selected and user is owner */}
                  {selectedTeam && isOwner && (
                    <button
                      onClick={() => setShowTeamSettings(true)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-blue/10 transition-colors group-data-[collapsible=icon]:hidden"
                    >
                      <IconSettings className="!size-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Team Members Section */}
        {selectedTeam && (
          <TeamMembersSection
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
            currentUserId={user?.id || ''}
            isOwner={isOwner}
          />
        )}

        {/* Projects under team */}
        <SidebarGroup>
          <SidebarGroupLabel className={selectedTeam ? "text-brand-blue" : "text-muted-foreground"}>
            Projects
          </SidebarGroupLabel>
          <SidebarMenu>
            <Collapsible defaultOpen className="group/collapsible" disabled={!selectedTeam}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className={selectedTeam ? "hover:bg-brand-blue/10" : "opacity-50 cursor-not-allowed"}
                    disabled={!selectedTeam}
                  >
                    <IconChartBar className={`!size-4 ${selectedTeam ? "text-brand-blue" : "text-muted-foreground"}`} />
                    <span>Strategies</span>
                    <IconChevronDown className={`ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180 !size-4 ${selectedTeam ? "text-brand-blue" : "text-muted-foreground"}`} />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {projects.map((project) => {
                      const isActive = pathname === `/lab/${selectedTeam?.id}/${project.id}`
                      return (
                        <ProjectMenuItem
                          key={project.id}
                          project={project}
                          selectedTeam={selectedTeam}
                          isActive={isActive}
                          user={user}
                          isOwner={isOwner}
                          onRename={() => setShowRenameProject(project.id)}
                          onDelete={() => handleDeleteProject(project.id, project.name)}
                          projectUsers={usersByProject.get(project.id) || []}
                        />
                      )
                    })}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => selectedTeam && setShowCreateProject(true)}
                        className={!selectedTeam ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        <IconPlus className="mr-2 !size-4" />
                        New Strategy
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>

        {/* Resources Section */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-brand-blue">Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/lab/learn">
                    <IconSchool className="!size-4" />
                    <span>Learn</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/lab/tutorials">
                    <IconBook className="!size-4" />
                    <span>Tutorials</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/lab/docs">
                    <IconFileText className="!size-4" />
                    <span>Documentation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-brand-blue/20">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-brand-blue/10">
              <Link href="/lab/settings">
                <IconSettings className="!size-4 text-brand-blue" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <CreateTeamDialog
        open={showCreateTeam}
        onOpenChange={setShowCreateTeam}
        onCreateTeam={handleCreateTeam}
      />

      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onCreateProject={handleCreateProject}
      />

      {selectedTeam && (
        <RenameTeamDialog
          open={showRenameTeam}
          onOpenChange={setShowRenameTeam}
          teamName={selectedTeam.name}
          teamDescription={selectedTeam.description}
          onSubmit={handleRenameTeam}
        />
      )}

      {showRenameProject && (
        <RenameProjectDialog
          open={true}
          onOpenChange={(open) => !open && setShowRenameProject(null)}
          projectName={projects.find(p => p.id === showRenameProject)?.name || ''}
          projectDescription={projects.find(p => p.id === showRenameProject)?.description}
          onSubmit={(name, description) => handleRenameProject(showRenameProject, name, description)}
        />
      )}

      {selectedTeam && (
        <TeamSettingsDialog
          open={showTeamSettings}
          onOpenChange={setShowTeamSettings}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          teamDescription={selectedTeam.description}
          teamAvatarUrl={selectedTeam.avatar_url}
          onUpdate={async (updates) => {
            await updateTeam(selectedTeam.id, updates)
            const updatedTeam = { ...selectedTeam, ...updates }
            setTeams(teams.map(t => t.id === updatedTeam.id ? updatedTeam : t))
            setSelectedTeam(updatedTeam)
          }}
          onDelete={handleDeleteTeam}
        />
      )}
    </Sidebar>
  )
}
