'use server'

// DAL imports - using repository pattern with ABAC authorization
import { buildUserContext } from '@/lib/dal/context'
import { NotificationRepository } from '@/lib/dal/repositories'
import { protectAction } from '@/lib/arcjet'

/**
 * Delete a notification
 * ABAC ensures users can only delete their own notifications
 */
export async function deleteNotification(notificationId: string) {
    // Arcjet rate limiting protection
    await protectAction('deleteNotification')

    // Build user context for ABAC authorization
    const userContext = await buildUserContext()
    if (!userContext) throw new Error('Not authenticated')

    // Use NotificationRepository - ABAC verifies user owns this notification
    const notificationRepo = new NotificationRepository(userContext)
    await notificationRepo.deleteNotification(notificationId)

    return { success: true }
}
