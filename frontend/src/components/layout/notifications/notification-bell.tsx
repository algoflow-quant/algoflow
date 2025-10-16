"use client"

import { useEffect, useState } from "react"
import { IconBell } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getUnreadCount } from "@/lib/api/notifications"
import { NotificationsPanel } from "./notifications-panel"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/contexts/AuthContext"
import { toast } from "sonner"

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    loadUnreadCount()
  }, [])

  // Real-time subscriptions for notifications
  useEffect(() => {
    console.log('[NotificationBell] useEffect triggered, user:', user?.id)

    if (!user?.id) {
      console.log('[NotificationBell] No user ID, skipping subscription')
      return
    }

    const supabase = createClient()
    console.log('[NotificationBell] Creating Supabase client and channel')

    const notificationsChannel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('[NotificationBell] Notification change detected:', payload)

          if (payload.eventType === 'INSERT') {
            const notification = payload.new as {
              id: string
              title: string
              message: string
              type: string
              read: boolean
            }

            console.log('[NotificationBell] New notification:', notification)

            // Increment unread count
            setUnreadCount(prev => prev + 1)

            // Show toast notification in top right
            if (notification.type === 'team_invitation') {
              toast.success(notification.title, {
                description: notification.message,
                duration: 5000,
              })
            } else if (notification.type === 'admin_message') {
              toast.info(notification.title, {
                description: notification.message,
                duration: 5000,
              })
            } else {
              toast(notification.title, {
                description: notification.message,
                duration: 4000,
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const notification = payload.new as { read: boolean }
            console.log('[NotificationBell] Notification updated:', notification)
            // If notification was marked as read, decrement count
            if (notification.read) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('[NotificationBell] Notification deleted')
            // Refresh count when notification is deleted
            loadUnreadCount()
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[NotificationBell] Subscription status:', status)
        if (err) {
          console.error('[NotificationBell] Subscription error:', err)
        }
        if (status === 'SUBSCRIBED') {
          console.log('[NotificationBell] Successfully subscribed to notifications')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[NotificationBell] Channel error - realtime not enabled on notifications table')
        } else if (status === 'TIMED_OUT') {
          console.error('[NotificationBell] Subscription timed out')
        } else if (status === 'CLOSED') {
          console.log('[NotificationBell] Channel closed')
        }
      })

    console.log('[NotificationBell] Channel created, waiting for subscription...')

    return () => {
      console.log('[NotificationBell] Cleaning up subscription')
      supabase.removeChannel(notificationsChannel)
    }
  }, [user?.id])

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const handleNotificationRead = () => {
    loadUnreadCount()
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <IconBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[450px] p-0 max-h-[600px]">
        <NotificationsPanel onNotificationRead={handleNotificationRead} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
