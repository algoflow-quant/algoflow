"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { IconCheck, IconTrash, IconInfoCircle, IconCircleCheck, IconAlertTriangle, IconAlertCircle, IconBell, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShineBorder } from "@/components/ui/shine-border"
import { cn } from "@/lib/utils"
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  type Notification,
} from "@/lib/api/notifications"
import { acceptTeamInvitation, declineTeamInvitation } from "@/lib/api/teams"
import { formatDistanceToNow } from "date-fns"

interface NotificationsPanelProps {
  onNotificationRead?: () => void
}

export function NotificationsPanel({ onNotificationRead }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [processingInvite, setProcessingInvite] = useState<string | null>(null)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async (invitationId: string, notificationId: string) => {
    setProcessingInvite(invitationId)
    try {
      await acceptTeamInvitation(invitationId)
      await handleDelete(notificationId)
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error) || 'Failed to accept invitation')
    } finally {
      setProcessingInvite(null)
    }
  }

  const handleDeclineInvitation = async (invitationId: string, notificationId: string) => {
    setProcessingInvite(invitationId)
    try {
      await declineTeamInvitation(invitationId)
      await handleDelete(notificationId)
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error) || 'Failed to decline invitation')
    } finally {
      setProcessingInvite(null)
    }
  }

  const extractInvitationId = (link: string | null): string | null => {
    if (!link) return null
    const match = link.match(/invitation=([a-f0-9-]+)/)
    return match ? match[1] : null
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      onNotificationRead?.()
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      onNotificationRead?.()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      onNotificationRead?.()
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleDeleteAllRead = async () => {
    try {
      await deleteAllRead()
      setNotifications(prev => prev.filter(n => !n.read))
      onNotificationRead?.()
    } catch (error) {
      console.error('Error deleting read notifications:', error)
    }
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <IconCircleCheck className="h-5 w-5 text-green-500" />
      case 'warning':
        return <IconAlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <IconAlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <IconInfoCircle className="h-5 w-5 text-blue-500" />
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-brand-blue border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full space-y-4 border rounded-lg p-4">
      {/* Action Bar */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
            </p>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-2 text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8"
              >
                <IconCheck className="h-3.5 w-3.5 mr-1.5" />
                Mark all read
              </Button>
            )}
            {notifications.some(n => n.read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAllRead}
                className="h-8 text-muted-foreground hover:text-destructive"
              >
                <IconTrash className="h-3.5 w-3.5 mr-1.5" />
                Clear read
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <div className="rounded-full bg-muted/50 p-6 mb-4">
            <IconBell className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm text-muted-foreground mt-2">
            You&apos;re all caught up! Check back later for updates.
          </p>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto flex-1">
          {notifications.map((notification) => (
            <ShineBorder
              key={notification.id}
              color={!notification.read ? ["#3b82f6", "#60a5fa", "#93c5fd"] : ["#6b7280", "#9ca3af"]}
              className={cn(
                "group relative bg-card hover:bg-accent/20 transition-all duration-300",
                !notification.read && "shadow-lg shadow-blue-500/10"
              )}
            >
              <div className="flex gap-4 p-5">
                {/* Icon */}
                <div className="relative flex-shrink-0 mt-0.5">
                  {!notification.read && (
                    <div className="absolute -left-2 -top-1 h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    notification.type === 'success' && "bg-green-100 dark:bg-green-950",
                    notification.type === 'warning' && "bg-yellow-100 dark:bg-yellow-950",
                    notification.type === 'error' && "bg-red-100 dark:bg-red-950",
                    notification.type === 'info' && "bg-blue-100 dark:bg-blue-950"
                  )}>
                    {getIcon(notification.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        "text-base leading-tight",
                        !notification.read && "font-semibold"
                      )}>
                        {notification.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                          title="Mark as read"
                        >
                          <IconCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(notification.id)
                        }}
                        title="Delete"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span>
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {(() => {
                      const invitationId = extractInvitationId(notification.link || null)

                      if (invitationId && notification.title === 'Team Invitation') {
                        return (
                          <>
                            <span>•</span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-6 px-3 text-xs"
                                onClick={() => handleAcceptInvitation(invitationId, notification.id)}
                                disabled={processingInvite === invitationId}
                              >
                                <IconCheck className="h-3 w-3 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-3 text-xs"
                                onClick={() => handleDeclineInvitation(invitationId, notification.id)}
                                disabled={processingInvite === invitationId}
                              >
                                <IconX className="h-3 w-3 mr-1" />
                                Decline
                              </Button>
                            </div>
                          </>
                        )
                      }

                      if (notification.link) {
                        return (
                          <>
                            <span>•</span>
                            <Link
                              href={notification.link}
                              className="text-brand-blue hover:underline font-medium"
                              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                            >
                              View details →
                            </Link>
                          </>
                        )
                      }

                      return null
                    })()}
                  </div>
                </div>
              </div>
            </ShineBorder>
          ))}
        </div>
      )}
    </div>
  )
}
