"use client"

import type { User } from "@supabase/supabase-js"
import { AppSidebar } from "@/components/platform/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { TeamSelectionContent } from "@/components/platform/team/team-selection-content"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

interface LabPageClientProps {
  user: User
}

export function LabPageClient({ user }: LabPageClientProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 10)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <TeamSelectionContent />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
