import React from 'react'

// Supabase imports
import { createClient } from '@/server/supabase/server'

// Component imports
import AvatarDropdown from '@/components/shared/AvatarDropdown'
import Logo from '@/components/shared/Logo'

export default async function SpaHeader() {
  // Create the supabase client
  const supabase = await createClient()

  // Grab the user data
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-13 items-center justify-between px-4">
        {/* Left side */}
        <div className="flex items-center gap-4 -ml-2.5">
          <Logo showText={false} href="/lab" />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user && <AvatarDropdown user={user} />}
        </div>
      </div>
    </header>
  )
}
