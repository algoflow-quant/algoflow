"use client"

import { useState, useEffect } from "react"
import { NotificationsPanel } from "@/components/layout/notifications/notifications-panel"
import { AdminMessageForm } from "@/components/layout/notifications/admin-message-form"
import { GridPattern } from "@/components/ui/grid-pattern"
import { cn } from "@/lib/utils"
import { isAdmin } from "@/lib/api/notifications"

export default function NotificationsPage() {
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  useEffect(() => {
    isAdmin()
      .then(setIsUserAdmin)
      .catch(() => setIsUserAdmin(false))
      .finally(() => setCheckingAdmin(false))
  }, [])

  return (
    <div className="relative flex min-h-screen w-full items-start justify-center overflow-hidden bg-gradient-to-br from-background via-brand-blue/5 to-background p-6 md:p-12">
      {/* Grid Background */}
      <GridPattern
        width={40}
        height={40}
        className={cn(
          "[mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]",
          "stroke-brand-blue/10 fill-brand-blue/5"
        )}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your latest activity and system alerts
          </p>
        </div>

        {/* Admin Panel */}
        {!checkingAdmin && isUserAdmin && (
          <AdminMessageForm onSuccess={() => window.location.reload()} />
        )}

        {/* Notifications Panel */}
        <NotificationsPanel />
      </div>
    </div>
  )
}
