// React imports
import React from 'react'

// Next.js imports
import Link from 'next/link'

// Supabase imports
import { createClient } from '@/utils/supabase/server'

// Component imports
import { Button } from '@/components/ui/button'
import { ShineBorder } from "@/components/ui/shine-border"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FaGithub } from "react-icons/fa"
import { User, Settings, Database, Command, LogOut } from "lucide-react"
import { logout } from '@/app/(auth)/login/actions'
import { ThemeSelector } from './ThemeSelector'

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
    const userInitials = user.user_metadata?.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase() || user.email?.[0].toUpperCase() || 'U'

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-7.5 w-7.5">
                <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || user.email} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-muted">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/lab/settings" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/lab/projects" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                All Projects
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Command className="h-4 w-4" />
                Command Menu
              </div>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium mb-2">Theme</p>
              <ThemeSelector />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={logout} className="w-full">
                <button type="submit" className="w-full text-left flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
