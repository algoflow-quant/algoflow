"use client"

import React from 'react'
import Link from 'next/link'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const AuthButton = () => {
  // Hardcoded for now - will be replaced with useUser() hook later
  const isLoggedIn = false
  const user = {
    name: "John Doe",
    email: "john@example.com",
    avatar: null
  }

  if (isLoggedIn) {
    return <UserMenu user={user} />
  }

  return <LoginButtons />
}

const LoginButtons = () => {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" asChild>
        <Link href="/login">Login</Link>
      </Button>
      <Button className="rounded-full bg-brand-blue hover:bg-brand-blue-dark" asChild>
        <Link href="/register">Sign Up</Link>
      </Button>
    </div>
  )
}

const UserMenu = ({ user }: { user: { name: string; email: string; avatar: string | null } }) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="rounded-full flex items-center gap-2">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/lab" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Go to Lab
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Export UserMenu separately for reuse in sidebar
export { UserMenu }

export default AuthButton
