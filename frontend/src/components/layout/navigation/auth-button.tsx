"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { User, ChevronDown } from 'lucide-react'

export const AuthButton = () => {
  // Hardcoded for now - will be replaced with useUser() hook later
  const isLoggedIn = false
  const user = {
    name: "John Doe",
    email: "john@example.com",
    avatar: null // Will use avatar URL from Supabase later
  }

  if (isLoggedIn) {
    return <UserMenu user={user} />
  }

  return <LoginButtons />
}

const LoginButtons = () => {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="text-sm px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full transition-colors"
      >
        Sign Up
      </Link>
    </div>
  )
}

const UserMenu = ({ user }: { user: { name: string; email: string; avatar: string | null } }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-accent transition-colors"
      >
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
          <div className="px-4 py-2 border-b border-border">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Link
            href="/settings"
            className="block px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            Settings
          </Link>
          <Link
            href="/lab"
            className="block px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            Go to Lab
          </Link>
          <button
            className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-accent transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

// Export UserMenu separately for reuse in sidebar
export { UserMenu }

export default AuthButton
