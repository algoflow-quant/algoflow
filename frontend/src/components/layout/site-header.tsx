"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useState } from "react"
import { getUserTeams, getTeamProjects, type Team, type Project } from "@/lib/api/teams"
import { createClient } from "@/lib/supabase/client"
import { NotificationBell } from "@/components/layout/notifications/notification-bell"

const resourceRoutes: Record<string, string> = {
  learn: "Learn",
  tutorials: "Tutorials",
  docs: "Documentation",
  settings: "Settings",
  notifications: "Notifications",
}

export function SiteHeader() {
  const pathname = usePathname()
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userTeams = await getUserTeams()
        setTeams(userTeams)

        // Fetch projects for all teams
        const allProjects = await Promise.all(
          userTeams.map(team => getTeamProjects(team.id))
        )
        setProjects(allProjects.flat())
      } catch (error) {
        console.error('Error fetching breadcrumb data:', error)
      }
    }

    fetchData()
  }, [])

  // Real-time subscriptions for teams
  useEffect(() => {
    const supabase = createClient()

    const teamsChannel = supabase
      .channel('breadcrumb-teams')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTeam = payload.new as Team
            setTeams(prev => {
              if (prev.some(t => t.id === newTeam.id)) return prev
              return [...prev, newTeam]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedTeam = payload.new as Team
            setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t))
          } else if (payload.eventType === 'DELETE') {
            const deletedTeam = payload.old as Team
            setTeams(prev => prev.filter(t => t.id !== deletedTeam.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(teamsChannel)
    }
  }, [])

  // Real-time subscriptions for projects
  useEffect(() => {
    const supabase = createClient()

    const projectsChannel = supabase
      .channel('breadcrumb-projects')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProject = payload.new as Project
            setProjects(prev => {
              if (prev.some(p => p.id === newProject.id)) return prev
              return [...prev, newProject]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedProject = payload.new as Project
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p))
          } else if (payload.eventType === 'DELETE') {
            const deletedProject = payload.old as Project
            setProjects(prev => prev.filter(p => p.id !== deletedProject.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(projectsChannel)
    }
  }, [])

  // Parse pathname to build breadcrumbs
  const pathSegments = pathname.split("/").filter(Boolean)

  const getBreadcrumbs = () => {
    const crumbs = [{ label: "Dashboard", href: "/lab" }]

    if (pathSegments.length <= 1) {
      return crumbs
    }

    // Check if it's a team/project route
    if (pathSegments.length >= 3 && pathSegments[0] === "lab") {
      const teamId = pathSegments[1]
      const projectId = pathSegments[2]

      const team = teams.find(t => t.id === teamId)
      const project = projects.find(p => p.id === projectId)

      if (team) {
        crumbs.push({ label: team.name, href: `/lab/${teamId}` })
      }
      if (project) {
        crumbs.push({ label: project.name, href: `/lab/${teamId}/${projectId}` })
      }
    }
    // Check if it's a resource route
    else if (pathSegments.length >= 2 && pathSegments[0] === "lab") {
      const resource = pathSegments[1]
      if (resourceRoutes[resource]) {
        crumbs.push({ label: resourceRoutes[resource], href: `/lab/${resource}` })
      }
    }

    return crumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 border-b-2 border-brand-blue/20 bg-[rgb(var(--header-bg))] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 hover:bg-brand-blue/10" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 bg-brand-blue/20"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <AnimatedThemeToggler />
        </div>
      </div>
    </header>
  )
}
