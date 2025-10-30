'use server'

// DAL imports - using repository pattern with ABAC authorization
import { buildUserContext } from '@/lib/dal/context'
import { NotificationRepository } from '@/lib/dal/repositories'
import { protectAction } from '@/lib/arcjet'

/**
 * Mark a single notification as read
 * ABAC ensures users can only mark their own notifications as read
 */
export async function markAsRead(notificationId: string) {
    // Arcjet rate limiting protection
    await protectAction('markAsRead')

    // Build user context for ABAC authorization
    const userContext = await buildUserContext()
    if (!userContext) throw new Error('Not authenticated')

    // Use NotificationRepository - ABAC verifies user owns this notification
    const notificationRepo = new NotificationRepository(userContext)
    await notificationRepo.markAsRead(notificationId)

    return { success: true }
}

/**
 * Mark all user's notifications as read
 * ABAC ensures users can only mark their own notifications
 */
export async function markAllAsRead(userId: string) {
    // Arcjet rate limiting protection
    await protectAction('markAsRead')

    // Build user context for ABAC authorization
    const userContext = await buildUserContext()
    if (!userContext) throw new Error('Not authenticated')

    // Use NotificationRepository - ABAC verifies user can only mark their own notifications
    const notificationRepo = new NotificationRepository(userContext)
    await notificationRepo.markAllAsRead()

    return { success: true }
}