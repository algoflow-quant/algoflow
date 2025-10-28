'use server'

// DAL imports - using repository pattern with ABAC authorization
import { buildUserContext } from '@/lib/dal/context'
import { NotificationRepository } from '@/lib/dal/repositories'

// Type imports
import type { Notification } from '../types'

/**
 * Get notifications server action - uses DAL with ABAC
 * ABAC ensures users can only read their own notifications
 */
export async function getNotifications(userId: string): Promise<Notification[]> {
    // Build user context for ABAC authorization
    const userContext = await buildUserContext()
    if (!userContext) throw new Error('Not authenticated')

    // Use NotificationRepository - ABAC checks user can only read their own notifications
    const notificationRepo = new NotificationRepository(userContext)
    const notifications = await notificationRepo.getMyNotifications()

    // Convert Date objects to ISO strings for client compatibility
    return notifications.map(notification => ({
        ...notification,
        created_at: notification.created_at.toISOString(),
    })) as Notification[]
}