"use client"

import * as React from "react"
import {
  IconBook,
  IconSchool,
  IconFileText,
  IconChevronDown,
  IconPlus,
  IconFolder,
  IconChartBar,
  IconSettings,
  IconArrowLeft,
} from "@tabler/icons-react"

import { NavUser } from "@/components/nav-user"
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
import { getUserTeams, getTeamProjects, createTeam, createProject, type Team, type Project } from "@/lib/api/teams"
import { CreateTeamDialog } from "@/components/create-team-dialog"
import { CreateProjectDialog } from "@/components/create-project-dialog"

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: any }) {
  const [teams, setTeams] = React.useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCreateTeam, setShowCreateTeam] = React.useState(false)
  const [showCreateProject, setShowCreateProject] = React.useState(false)

  // Fetch teams on mount
  React.useEffect(() => {
    async function fetchTeams() {
      try {
        const userTeams = await getUserTeams()
        setTeams(userTeams)
        if (userTeams.length > 0) {
          setSelectedTeam(userTeams[0])
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching teams:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [])

  // Fetch projects when selected team changes
  React.useEffect(() => {
    async function fetchProjects() {
      if (!selectedTeam) return

      try {
        const teamProjects = await getTeamProjects(selectedTeam.id)
        setProjects(teamProjects)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching projects:', error)
      }
    }

    fetchProjects()
  }, [selectedTeam])

  const handleCreateTeam = async (name: string, description?: string) => {
    try {
      const newTeam = await createTeam(name, description)
      setTeams([...teams, newTeam])
      setSelectedTeam(newTeam)
    } catch (error: any) {
      alert(error.message || 'Failed to create team')
      throw error
    }
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
    } catch (error: any) {
      alert(error.message || 'Failed to create project')
      throw error
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
              <a href="/" className="text-muted-foreground hover:text-foreground">
                <IconArrowLeft className="!size-4" />
                <span>Back to Homepage</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User profile */}
        <NavUser user={user} />
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="hover:bg-brand-blue/10">
                <a href="/lab">
                  <IconChartBar className="!size-4 text-brand-blue" />
                  <span>Dashboard</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Team Selector */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-brand-blue">Team</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              {teams.length === 0 ? (
                <SidebarMenuButton onClick={() => setShowCreateTeam(true)}>
                  <IconPlus className="!size-4" />
                  <span>Create Your First Team</span>
                </SidebarMenuButton>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton>
                      <IconFolder className="!size-4" />
                      <span>{selectedTeam?.name || 'Select team'}</span>
                      <IconChevronDown className="ml-auto !size-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start">
                    {teams.map((team) => (
                      <DropdownMenuItem
                        key={team.id}
                        onClick={() => setSelectedTeam(team)}
                      >
                        {team.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowCreateTeam(true)}>
                      <IconPlus className="mr-2 !size-4" />
                      Create New Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Projects under team */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-brand-blue">Projects</SidebarGroupLabel>
          <SidebarMenu>
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="hover:bg-brand-blue/10">
                    <IconChartBar className="!size-4 text-brand-blue" />
                    <span>Strategies</span>
                    <IconChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180 !size-4 text-brand-blue" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {projects.map((project) => (
                      <SidebarMenuSubItem key={project.id}>
                        <SidebarMenuSubButton asChild>
                          <a href={`/lab/${selectedTeam?.id}/${project.id}`}>
                            {project.name}
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton onClick={() => setShowCreateProject(true)}>
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
                  <a href="/lab/learn">
                    <IconSchool className="!size-4" />
                    <span>Learn</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/lab/tutorials">
                    <IconBook className="!size-4" />
                    <span>Tutorials</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/lab/docs">
                    <IconFileText className="!size-4" />
                    <span>Documentation</span>
                  </a>
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
              <a href="/lab/settings">
                <IconSettings className="!size-4 text-brand-blue" />
                <span>Settings</span>
              </a>
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
    </Sidebar>
  )
}
