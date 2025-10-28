// React imports
import React from 'react'

// Supabase imports
import { createClient } from '@/lib/supabase/server'

// DAL imports
import { buildUserContext } from '@/lib/dal/context'
import { ProfileRepository } from '@/lib/dal/repositories/profile.repository'
import type { profiles } from '@/generated/prisma'

// Component imports
import AvatarDropdown from '@/components/shared/AvatarDropdown'
import NotificationsDropdown from '@/features/organizations/notifications/components/NotifcationsDropdown'
import Logo from '@/components/shared/Logo'

export default async function SpaHeader() {
  // Get authenticated user from Supabase Auth. not done via dal or abac but by server component itself
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch profile data using DAL + ABAC
  let profileData: profiles | null = null
  if (user) {
    // Build user context from session
    const userContext = await buildUserContext()

    if (userContext) {
      // Create repository with user context
      const profileRepo = new ProfileRepository(userContext)
      // Fetch public profile (ABAC checks permission)
      profileData = await profileRepo.getProfile(user.id)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-13 items-center justify-between px-4">
        {/* Left side */}
        <div className="flex items-center gap-4 -ml-2.5">
          <Logo showText={false} href="/lab" />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              <NotificationsDropdown userId={user.id} />
              {/* @ts-expect-error - VS Code type cache issue, types are correct at runtime */}
              <AvatarDropdown user={user} profile={profileData} />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
