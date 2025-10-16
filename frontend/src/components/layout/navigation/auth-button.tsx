"use client"

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface Profile {
  name: string | null
  avatar_url: string | null
}

export const AuthButton = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (user) {
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

const UserMenu = ({ user }: { user: SupabaseUser }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const { signOut } = useAuth()

  React.useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Real-time subscription for profile changes
  React.useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()

    const profileChannel = supabase
      .channel(`auth-button-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          const updatedProfile = payload.new as { name: string | null; avatar_url: string | null }
          setProfile(updatedProfile)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profileChannel)
    }
  }, [user?.id])

  const loadProfile = async () => {
    if (!user?.id) return

    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  const displayName = profile?.name || user.user_metadata?.full_name || user.email || 'User'
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="rounded-full flex items-center gap-2">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={32}
              height={32}
              className="rounded-full"
            />
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
            <p className="text-sm font-medium">{displayName}</p>
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
        <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
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
