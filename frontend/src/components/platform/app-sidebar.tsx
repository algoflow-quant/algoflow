"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getUserTeams, getTeamProjects, createTeam, createProject, updateTeam, deleteTeam, updateProject, deleteProject, isTeamOwner, canModifyProjectSync, type Team, type Project } from "@/lib/api/teams"
import { CreateTeamDialog } from "@/components/platform/team/create-team-dialog"
import { CreateProjectDialog } from "@/components/platform/project/create-project-dialog"
import { RenameTeamDialog } from "@/components/platform/team/rename-team-dialog"
import { RenameProjectDialog } from "@/components/platform/project/rename-project-dialog"

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const [teams, setTeams] = React.useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCreateTeam, setShowCreateTeam] = React.useState(false)
  const [showCreateProject, setShowCreateProject] = React.useState(false)
  const [showRenameTeam, setShowRenameTeam] = React.useState(false)
  const [showRenameProject, setShowRenameProject] = React.useState<string | null>(null)
  const [isOwner, setIsOwner] = React.useState(false)

  // Fetch teams on mount
  React.useEffect(() => {
    async function fetchTeams() {
      try {
        const userTeams = await getUserTeams()
        setTeams(userTeams)
      } catch (error) {
        // eslint-disable-next-line no-console
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

    window.addEventListener('teamCreated', handleTeamCreated)
    return () => window.removeEventListener('teamCreated', handleTeamCreated)
  }, [])

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
        // eslint-disable-next-line no-console
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

  const handleCreateTeam = async (name: string, description?: string) => {
    try {
      const newTeam = await createTeam(name, description)
      setTeams([...teams, newTeam])
      setSelectedTeam(newTeam)
      router.push(`/lab/${newTeam.id}`)
    } catch (error: any) {
      alert(error.message || 'Failed to create team')
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
        type: type as any,
      })
      setProjects([...projects, newProject])
      // Navigate to the new project
      router.push(`/lab/${selectedTeam.id}/${newProject.id}`)
    } catch (error: any) {
      alert(error.message || 'Failed to create project')
      throw error
    }
  }

  const handleRenameTeam = async (name: string, description?: string) => {
    if (!selectedTeam) return

    try {
      const updatedTeam = await updateTeam(selectedTeam.id, { name, description })
      setTeams(teams.map(t => t.id === updatedTeam.id ? updatedTeam : t))
      setSelectedTeam(updatedTeam)
    } catch (error: any) {
      alert(error.message || 'Failed to rename team')
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
    } catch (error: any) {
      alert(error.message || 'Failed to delete team')
    }
  }

  const handleRenameProject = async (projectId: string, name: string, description?: string) => {
    try {
      const updatedProject = await updateProject(projectId, { name, description })
      setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p))
    } catch (error: any) {
      alert(error.message || 'Failed to rename project')
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
    } catch (error: any) {
      alert(error.message || 'Failed to delete project')
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
                      <SidebarMenuButton className="h-auto py-3 hover:bg-brand-blue/10 flex-1">
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue font-semibold text-sm">
                            {selectedTeam ? (
                              selectedTeam.name.slice(0, 2).toUpperCase()
                            ) : (
                              <IconPlus className="!size-5" />
                            )}
                          </div>
                          <div className="flex flex-col items-start flex-1 min-w-0">
                            <span className="text-sm font-semibold truncate">
                              {selectedTeam?.name || 'Select Team'}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {selectedTeam ? 'Active workspace' : 'Choose a team'}
                            </span>
                          </div>
                          <IconChevronDown className="!size-4 ml-auto flex-shrink-0" />
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
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue font-semibold text-xs flex-shrink-0">
                            {team.name.slice(0, 2).toUpperCase()}
                          </div>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-blue/10 transition-colors">
                          <IconDotsVertical className="!size-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setShowRenameTeam(true)}
                          disabled={!isOwner}
                        >
                          <IconPencil className="mr-2 !size-4" />
                          <span>Rename Team</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleDeleteTeam}
                          disabled={!isOwner}
                          className="text-destructive"
                        >
                          <IconTrash className="mr-2 !size-4" />
                          <span>Delete Team</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

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
                        <SidebarMenuSubItem key={project.id}>
                          <div className="flex items-center gap-1 group">
                            <SidebarMenuSubButton asChild className="flex-1">
                              <Link
                                href={`/lab/${selectedTeam?.id}/${project.id}`}
                                className={isActive ? "bg-brand-blue/10 text-brand-blue font-semibold" : ""}
                              >
                                {project.name}
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
                                  onClick={() => setShowRenameProject(project.id)}
                                  disabled={!canModifyProjectSync(project, user?.id || '', isOwner)}
                                >
                                  <IconPencil className="mr-2 !size-4" />
                                  <span>Rename</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteProject(project.id, project.name)}
                                  disabled={!canModifyProjectSync(project, user?.id || '', isOwner)}
                                  className="text-destructive"
                                >
                                  <IconTrash className="mr-2 !size-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </SidebarMenuSubItem>
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
    </Sidebar>
  )
}
