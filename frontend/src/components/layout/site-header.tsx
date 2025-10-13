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
import { Fragment } from "react"

// Mock data - should match sidebar data
const teams = [
  { id: "1", name: "Personal" },
  { id: "2", name: "LSU Quant Team" },
  { id: "3", name: "Research Group" },
]

const projects = [
  { id: "1", name: "Momentum Strategy", teamId: "1" },
  { id: "2", name: "Mean Reversion", teamId: "1" },
  { id: "3", name: "ML Predictor", teamId: "2" },
]

const resourceRoutes: Record<string, string> = {
  learn: "Learn",
  tutorials: "Tutorials",
  docs: "Documentation",
  settings: "Settings",
}

export function SiteHeader() {
  const pathname = usePathname()

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
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b-2 border-brand-blue/20 bg-brand-blue/5 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
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
        <div className="ml-auto">
          <AnimatedThemeToggler />
        </div>
      </div>
    </header>
  )
}
