// Base dal repository class with clients & user context already passed
import { Repository } from '../base/repository'

// Authorizor wrapper to validate users
import { requireAuthorization } from '@/lib/abac/authorizer'

// Custom error classes
import { NotFoundError } from '../utils/errors'

// notifications interface for type safety
import type { notifications } from '@/generated/prisma'

// What fields can user provide when creating notification
type NotificationCreateData = {
    userId: string
    type: 'invitation' | 'role_changed' | 'removed_from_org' | 'system'
    title: string
    message: string
    data?: Record<string, any>
    actionUrl?: string
}

export class NotificationRepository extends Repository {
    //=========================== READ OPERATIONS ============================

    // Get all notifications for current user
    async getMyNotifications(unreadOnly: boolean = false): Promise<notifications[]> {
        // ABAC check - can user read their own notifications?
        requireAuthorization({
            user: this.userContext,
            action: 'read',
            resource: {
                type: 'notification',
                ownerId: this.userContext.id,
            },
        })

        const where: any = {
            user_id: this.userContext.id,
        }

        if (unreadOnly) {
            where.read = false
        }

        return await this.prisma.notifications.findMany({
            where,
            orderBy: { created_at: 'desc' },
        })
    }

    // Get notification by ID
    async getNotification(notificationId: string): Promise<notifications | null> {
        const notification = await this.prisma.notifications.findUnique({
            where: { id: notificationId },
        })

        if (!notification) {
            return null
        }

        // ABAC check - can user read this notification?
        requireAuthorization({
            user: this.userContext,
            action: 'read',
            resource: {
                type: 'notification',
                id: notificationId,
                ownerId: notification.user_id,
            },
        })

        return notification
    }

    // Get unread count for current user
    async getUnreadCount(): Promise<number> {
        // ABAC check - can user read their own notifications?
        requireAuthorization({
            user: this.userContext,
            action: 'read',
            resource: {
                type: 'notification',
                ownerId: this.userContext.id,
            },
        })

        return await this.prisma.notifications.count({
            where: {
                user_id: this.userContext.id,
                read: false,
            },
        })
    }

    //=========================== CREATE OPERATIONS ============================

    // Create notification (system/admin only)
    async createNotification(data: NotificationCreateData): Promise<notifications> {
        // ABAC check - can user create notifications?
        requireAuthorization({
            user: this.userContext,
            action: 'create',
            resource: {
                type: 'notification',
                ownerId: data.userId,
            },
        })

        return await this.prisma.notifications.create({
            data: {
                user_id: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                data: data.data || {},
                action_url: data.actionUrl,
            },
        })
    }

    //=========================== UPDATE OPERATIONS ============================

    // Mark notification as read
    async markAsRead(notificationId: string): Promise<void> {
        // Fetch notification
        const notification = await this.prisma.notifications.findUnique({
            where: { id: notificationId },
        })

        if (!notification) {
            throw new NotFoundError('Notification not found')
        }

        // ABAC check - can user update this notification?
        requireAuthorization({
            user: this.userContext,
            action: 'update',
            resource: {
                type: 'notification',
                id: notificationId,
                ownerId: notification.user_id,
            },
        })

        await this.prisma.notifications.update({
            where: { id: notificationId },
            data: { read: true },
        })
    }

    // Mark all user's notifications as read
    async markAllAsRead(): Promise<void> {
        // ABAC check - can user update their notifications?
        requireAuthorization({
            user: this.userContext,
            action: 'update',
            resource: {
                type: 'notification',
                ownerId: this.userContext.id,
            },
        })

        await this.prisma.notifications.updateMany({
            where: {
                user_id: this.userContext.id,
                read: false,
            },
            data: { read: true },
        })
    }

    //=========================== DELETE OPERATIONS ============================

    // Delete notification
    async deleteNotification(notificationId: string): Promise<void> {
        // Fetch notification
        const notification = await this.prisma.notifications.findUnique({
            where: { id: notificationId },
        })

        if (!notification) {
            throw new NotFoundError('Notification not found')
        }

        // ABAC check - can user delete this notification?
        requireAuthorization({
            user: this.userContext,
            action: 'delete',
            resource: {
                type: 'notification',
                id: notificationId,
                ownerId: notification.user_id,
            },
        })

        await this.prisma.notifications.delete({
            where: { id: notificationId },
        })
    }

    // Delete all user's notifications
    async deleteAllNotifications(): Promise<void> {
        // ABAC check - can user delete their notifications?
        requireAuthorization({
            user: this.userContext,
            action: 'delete',
            resource: {
                type: 'notification',
                ownerId: this.userContext.id,
            },
        })

        await this.prisma.notifications.deleteMany({
            where: { user_id: this.userContext.id },
        })
    }
}
