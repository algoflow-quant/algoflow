import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/platform/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default async function LabLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 10)",
        } as React.CSSProperties
      }
    >
      <AppSidebar user={user} />
      <SidebarInset className="p-0">
        <SiteHeader />
        <div className="flex flex-1 flex-col p-2">
          <div className="@container/main flex flex-1 flex-col overflow-hidden border-2 border-brand-blue/20 rounded-lg">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
