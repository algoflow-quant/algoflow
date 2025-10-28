'use server'

// DAL imports - using repository pattern with ABAC authorization
import { buildUserContext } from '@/lib/dal/context'
import { NotificationRepository } from '@/lib/dal/repositories'

// Arcjet rate limiting and bot protection
import { headers } from 'next/headers'
import arcjet, { slidingWindow, detectBot } from '@arcjet/next'

// Arcjet configuration for notification actions protection
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: 'LIVE', allow: [] }),
    slidingWindow({ mode: 'LIVE', interval: '1m', max: 100 }) // 100 notification actions per minute
  ]
})

/**
 * Mark a single notification as read
 * ABAC ensures users can only mark their own notifications as read
 */
export async function markAsRead(notificationId: string) {
    // Arcjet rate limiting protection
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error('Too many notification actions. Please try again later.')
        }
        throw new Error('Request blocked')
    }

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
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error('Too many notification actions. Please try again later.')
        }
        throw new Error('Request blocked')
    }

    // Build user context for ABAC authorization
    const userContext = await buildUserContext()
    if (!userContext) throw new Error('Not authenticated')

    // Use NotificationRepository - ABAC verifies user can only mark their own notifications
    const notificationRepo = new NotificationRepository(userContext)
    await notificationRepo.markAllAsRead()

    return { success: true }
}