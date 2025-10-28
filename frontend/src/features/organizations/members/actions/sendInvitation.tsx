'use server'

// DAL imports - using repository pattern with ABAC authorization
import { buildUserContextWithOrg, buildUserContext } from '@/lib/dal/context'
import { InvitationRepository, NotificationRepository, OrganizationRepository } from '@/lib/dal/repositories'
import { prisma } from '@/lib/dal/utils/prisma'

// Arcjet rate limiting and bot protection
import { headers } from 'next/headers'
import arcjet, { slidingWindow, detectBot } from '@arcjet/next'

// Arcjet configuration for invitation sending protection
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: 'LIVE', allow: [] }),
    slidingWindow({
      mode: 'LIVE',
      interval: '1m',
      max: 20 // Max 20 invitations per minute per user
    })
  ]
})

interface SendInvitationParams {
    organizationId: string
    email: string
    role: 'member' | 'moderator'
}

/**
 * Send organization invitation server action
 * - ABAC verifies user is owner/moderator of the organization
 * - Creates invitation with expiration (7 days default)
 * - Normalizes email (lowercase, trimmed)
 */
export async function sendInvitation({ organizationId, email, role }: SendInvitationParams) {
    // Arcjet rate limiting protection
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error('Too many invitations. Please try again later.')
        }
        throw new Error('Request blocked')
    }

    // Build user context with organization membership for ABAC
    const userContext = await buildUserContextWithOrg(organizationId)
    if (!userContext) throw new Error('Not authenticated')

    // Use InvitationRepository - ABAC verifies user is owner/moderator
    const invitationRepo = new InvitationRepository(userContext)
    const invitation = await invitationRepo.createInvitation({
        organizationId,
        email: email.toLowerCase().trim(),
        role,
    })

    // Check if invited email belongs to an existing user and create notification
    const invitedProfile = await prisma.profiles.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { id: true },
    })

    if (invitedProfile) {
        // Build context for the invited user to create notification
        const invitedUserContext = await buildUserContext()
        if (invitedUserContext) {
            // Get organization name for notification message
            const orgRepo = new OrganizationRepository(userContext)
            const org = await orgRepo.getOrganization(organizationId)

            // Create notification for invited user
            const notificationRepo = new NotificationRepository(invitedUserContext)
            await notificationRepo.createNotification({
                userId: invitedProfile.id,
                type: 'invitation',
                title: 'Organization Invitation',
                message: `You've been invited to join ${org?.name || 'an organization'} as a ${role}`,
                data: { invitation_id: invitation.id, organizationId },
                actionUrl: `/invitations`,
            })
        }
    }

    // Convert Date objects to ISO strings for client compatibility
    return {
        ...invitation,
        expires_at: invitation.expires_at.toISOString(),
        created_at: invitation.created_at.toISOString(),
        updated_at: invitation.updated_at.toISOString(),
    }
}