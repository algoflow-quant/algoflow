// React imports
import React from 'react'

// Next.js imports
import Link from 'next/link'

// Supabase imports
import { createClient } from '@/server/supabase/server'

// Component imports
import { Button } from '@/components/ui/button'
import { ShineBorder } from "@/components/ui/shine-border"
import AvatarDropdown from '@/components/shared/AvatarDropdown'
import { FaGithub } from "react-icons/fa"

export default async function AuthButtons() {
  // Create the supabase client
  const supabase = await createClient()

  // Grab the user data
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch GitHub stars
  let stars
  try {
    const res = await fetch('https://api.github.com/repos/algoflow-quant/algoflow', {
        next: { revalidate: 3600 } // Cache for 1 hour
    })
    const data = await res.json()
    stars = data.stargazers_count
  } catch (error) {
    console.error('Failed to fetch GitHub stars:', error)
  }

  if (user) {
    // Logged in conditional: shows avatar + strategy lab button
    return (
      <div className="flex items-center gap-2">
        <Link href="https://github.com/cadenlund/algoflow" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" className="h-[28px] text-xs tracking-wide flex items-center gap-2 text-muted-foreground">
            <FaGithub className="w-4 h-4" />
            {stars}
          </Button>
        </Link>
        <Link href="/lab">
          <Button variant="default" className="h-[28px] text-xs tracking-wide">
            Strategy Lab
          </Button>
        </Link>
        <AvatarDropdown user={user} />
      </div>
    )
  }

  // Logged out: Show Login + Build Your First Strategy buttons
  return (
    <div className="flex items-center gap-2">
      <Link href="https://github.com/cadenlund/algoflow" target="_blank" rel="noopener noreferrer">
        <Button variant="ghost" className="h-[28px] text-xs tracking-wide flex items-center gap-2 text-muted-foreground">
          <FaGithub className="w-4 h-4" />
          {stars}
        </Button>
      </Link>
      <Link href="/login">
        <Button variant="ghost" className="h-[28px] text-xs tracking-wide bg-muted/30">Login</Button>
      </Link>
      <div className="relative rounded-md">
        <ShineBorder shineColor="#3b82f6" className="rounded-md" />
        <Link href="/signup">
          <Button variant="outline" className="h-[28px] relative z-10 text-xs tracking-wide">Build Your First Strategy</Button>
        </Link>
      </div>
    </div>
  )
}
