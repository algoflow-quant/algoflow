"use client"

import { useEffect, useState } from "react"
import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/contexts/AuthContext"
import { getUnreadCount } from "@/lib/api/notifications"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"

interface Profile {
  name: string | null
  avatar_url: string | null
}

export function NavUser({ user }: { user?: User }) {
  const { isMobile } = useSidebar()
  const { signOut } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    loadUnreadCount()
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel(`nav-user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const notification = payload.new as { read: boolean }
            // Only increment if notification is unread
            if (!notification.read) {
              setUnreadCount(prev => prev + 1)
            }
          } else if (payload.eventType === 'UPDATE') {
            const oldNotification = payload.old as { read: boolean }
            const newNotification = payload.new as { read: boolean }
            // If changed from unread to read, decrement
            if (!oldNotification.read && newNotification.read) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
            // If changed from read to unread, increment
            if (oldNotification.read && !newNotification.read) {
              setUnreadCount(prev => prev + 1)
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedNotification = payload.old as { read: boolean }
            // Only decrement if the deleted notification was unread
            if (!deletedNotification.read) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          }
        }
      )
      .subscribe()

    // Subscribe to profile changes for avatar updates
    const profileChannel = supabase
      .channel(`nav-user-profile-${user.id}`)
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
      supabase.removeChannel(notificationsChannel)
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

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  const userName = profile?.name || user?.user_metadata?.full_name || user?.email || "User"
  const userEmail = user?.email || ""
  const avatarUrl = profile?.avatar_url || ""
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="relative overflow-visible">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={userName} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-destructive border-2 border-sidebar z-10" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {userEmail}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="relative">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={avatarUrl} alt={userName} />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive border-2 border-background" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userName}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {userEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/lab/account" className="cursor-pointer">
                  <IconUserCircle />
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/lab/notifications" className="cursor-pointer">
                  <IconNotification />
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/lab/settings?tab=billing" className="cursor-pointer">
                  <IconCreditCard />
                  Billing
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
