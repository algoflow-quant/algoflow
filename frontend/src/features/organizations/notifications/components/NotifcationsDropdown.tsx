'use client'

// Icon imports
import { Bell } from 'lucide-react'

// Component imports
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

// Hook imports
import { useNotifications } from '@/features/organizations/notifications/queries/useNotifications'
import { markAsRead, markAllAsRead } from '@/features/organizations/notifications/actions/markAsRead'
import { acceptInvitation, declineInvitation } from '@/features/organizations/members/actions/handleInvitation'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'

// Interface for dropdwon props
interface NotificationsDropdownProps {
  userId: string
}

export default function NotificationsDropdown({ userId }: NotificationsDropdownProps) {
  const { data: notifications = [], isLoading } = useNotifications(userId)
  const queryClient = useQueryClient()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId)
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(userId)
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
  }

  const handleAccept = async (invitationId: string, notificationId: string) => {
    setProcessingId(notificationId)
    try {
      await acceptInvitation(invitationId)
      // Mark as read and delete the notification after accepting
      await handleMarkAsRead(notificationId)
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['organization-members'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    } catch (error) {
      console.error('Failed to accept invitation:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDecline = async (invitationId: string, notificationId: string) => {
    setProcessingId(notificationId)
    try {
      await declineInvitation(invitationId)
      // Mark as read and delete the notification after declining
      await handleMarkAsRead(notificationId)
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    } catch (error) {
      console.error('Failed to decline invitation:', error)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0 relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
                <Badge
                variant="destructive"
                className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                >
                {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
            )}
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 bg-card">
            <div className="flex items-center justify-between p-4 pb-2">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </Button>
                )}
            </div>

            <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        Loading...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        No notifications
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer ${
                                    !notification.read ? 'bg-primary/5' : ''
                                }`}
                                onClick={() => handleMarkAsRead(notification.id)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm">{notification.title}</p>
                                            {!notification.read && (
                                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                        </p>
                                        {notification.type === 'invitation' && notification.data.invitation_id && (
                                            <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => handleAccept(notification.data.invitation_id!, notification.id)}
                                                    disabled={processingId === notification.id}
                                                >
                                                    {processingId === notification.id ? 'Processing...' : 'Accept'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDecline(notification.data.invitation_id!, notification.id)}
                                                    disabled={processingId === notification.id}
                                                >
                                                    Decline
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DropdownMenuContent>
    </DropdownMenu>
  )
}