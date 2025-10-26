import React from 'react'
import Link from 'next/link'
import { User as UserType } from '@supabase/supabase-js'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { User, Database, Command, LogOut } from "lucide-react"
import { logout } from '@/features/auth'
import { ThemeSelector } from '@/features/(marketing)/layout/header/ThemeSelector'

interface AvatarDropdownProps {
  user: UserType
}

export default function AvatarDropdown({ user }: AvatarDropdownProps) {
  const userInitials = user.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user.email?.[0].toUpperCase() || 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
          <Avatar className="h-8.5 w-8.5">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || user.email} />
            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card">
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
  )
}
