'use server'

// DAL imports - using repository pattern with ABAC authorization
import { buildUserContext } from '@/lib/dal/context'
import { InvitationRepository } from '@/lib/dal/repositories'
import { protectAction } from '@/lib/arcjet'

/**
 * Accept an organization invitation
 * - ABAC verifies invitation is addressed to the current user
 * - Creates organization_members record in transaction
 * - Updates invitation status to 'accepted'
 */
export async function acceptInvitation(invitationId: string) {
    // Arcjet rate limiting protection
    await protectAction('handleInvitation')

    // Build user context for ABAC authorization
    const userContext = await buildUserContext()
    if (!userContext) throw new Error('Not authenticated')

    // Use InvitationRepository - ABAC verifies user can accept this invitation
    // acceptInvitation() creates membership and updates status in a transaction
    const invitationRepo = new InvitationRepository(userContext)
    await invitationRepo.acceptInvitation(invitationId)

    return { success: true }
}

/**
 * Decline an organization invitation
 * - ABAC verifies invitation is addressed to the current user
 * - Updates invitation status to 'declined'
 */
export async function declineInvitation(invitationId: string) {
    // Arcjet rate limiting protection
    await protectAction('handleInvitation')

    // Build user context for ABAC authorization
    const userContext = await buildUserContext()
    if (!userContext) throw new Error('Not authenticated')

    // Use InvitationRepository - ABAC verifies user can decline this invitation
    const invitationRepo = new InvitationRepository(userContext)
    await invitationRepo.declineInvitation(invitationId)

    return { success: true }
}