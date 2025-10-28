// Base dal repository class with clients & user context already passed
import { Repository } from '../base/repository'

// Authorizor wrapper to validate users
import { requireAuthorization } from '@/lib/abac/authorizer'

// Custom error classes
import { NotFoundError, ValidationError } from '../utils/errors'

// organization_invitations interface for type safety
import type { organization_invitations } from '@/generated/prisma'

// What fields can user provide when creating invitation
type InvitationCreateData = {
    organizationId: string
    email: string
    role: 'member' | 'moderator'
}

export class InvitationRepository extends Repository {
    //=========================== READ OPERATIONS ============================

    // Get all invitations for an organization
    async getOrganizationInvitations(organizationId: string): Promise<organization_invitations[]> {
        // ABAC check - can user list invitations for this org?
        requireAuthorization({
            user: this.userContext,
            action: 'read',
            resource: {
                type: 'invitation',
                organizationId,
            },
        })

        // Fetch all pending invitations
        return await this.prisma.organization_invitations.findMany({
            where: {
                organization_id: organizationId,
                status: 'pending',
                expires_at: { gt: new Date() } // Not expired
            },
            orderBy: { created_at: 'desc' },
        })
    }

    // Get invitations for current user's email
    async getMyInvitations(): Promise<organization_invitations[]> {
        // Get user's email from profile
        const profile = await this.prisma.profiles.findUnique({
            where: { id: this.userContext.id },
            select: { email: true },
        })

        if (!profile) {
            return []
        }

        // Fetch pending invitations to user's email
        return await this.prisma.organization_invitations.findMany({
            where: {
                email: profile.email,
                status: 'pending',
                expires_at: { gt: new Date() } // Not expired
            },
            orderBy: { created_at: 'desc' },
        })
    }

    // Get specific invitation by ID
    async getInvitation(invitationId: string): Promise<organization_invitations | null> {
        const invitation = await this.prisma.organization_invitations.findUnique({
            where: { id: invitationId },
        })

        if (!invitation) {
            return null
        }

        // ABAC check - can user read this invitation?
        requireAuthorization({
            user: this.userContext,
            action: 'read',
            resource: {
                type: 'invitation',
                id: invitationId,
                organizationId: invitation.organization_id,
            },
        })

        return invitation
    }

    //=========================== CREATE OPERATIONS ============================

    // Create invitation (owner/moderator only)
    async createInvitation(data: InvitationCreateData): Promise<organization_invitations> {
        // ABAC check - can user create invitations for this org?
        requireAuthorization({
            user: this.userContext,
            action: 'create',
            resource: {
                type: 'invitation',
                organizationId: data.organizationId,
            },
        })

        // Check if the invited email belongs to an existing member
        const invitedProfile = await this.prisma.profiles.findUnique({
            where: { email: data.email },
            select: { id: true },
        })

        if (invitedProfile) {
            const existingMember = await this.prisma.organization_members.findUnique({
                where: {
                    organization_id_user_id: {
                        organization_id: data.organizationId,
                        user_id: invitedProfile.id,
                    },
                },
            })

            if (existingMember) {
                throw new ValidationError('User is already a member of this organization')
            }
        }

        // Check if there's already a pending invitation
        const existingInvitation = await this.prisma.organization_invitations.findFirst({
            where: {
                organization_id: data.organizationId,
                email: data.email,
                status: 'pending',
                expires_at: { gt: new Date() },
            },
        })

        if (existingInvitation) {
            throw new ValidationError('An invitation already exists for this email')
        }

        // Create invitation with 7-day expiration
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

        return await this.prisma.organization_invitations.create({
            data: {
                organization_id: data.organizationId,
                email: data.email,
                role: data.role,
                invited_by: this.userContext.id,
                expires_at: expiresAt,
            },
        })
    }

    //=========================== UPDATE OPERATIONS ============================

    // Accept invitation (creates membership)
    async acceptInvitation(invitationId: string): Promise<void> {
        // Fetch invitation
        const invitation = await this.prisma.organization_invitations.findUnique({
            where: { id: invitationId },
        })

        if (!invitation) {
            throw new NotFoundError('Invitation not found')
        }

        // Check if expired
        if (invitation.expires_at < new Date()) {
            throw new ValidationError('Invitation has expired')
        }

        // Check if status is pending
        if (invitation.status !== 'pending') {
            throw new ValidationError('Invitation is no longer valid')
        }

        // Get user's email to verify
        const profile = await this.prisma.profiles.findUnique({
            where: { id: this.userContext.id },
            select: { email: true },
        })

        if (!profile || profile.email !== invitation.email) {
            throw new ValidationError('This invitation is not for you')
        }

        // ABAC check - can user accept this invitation?
        requireAuthorization({
            user: this.userContext,
            action: 'update',
            resource: {
                type: 'invitation',
                id: invitationId,
                organizationId: invitation.organization_id,
                targetUserId: this.userContext.id,
            },
        })

        // Check if already a member
        const existingMember = await this.prisma.organization_members.findUnique({
            where: {
                organization_id_user_id: {
                    organization_id: invitation.organization_id,
                    user_id: this.userContext.id,
                },
            },
        })

        if (existingMember) {
            // Update invitation status but don't create duplicate membership
            await this.prisma.organization_invitations.update({
                where: { id: invitationId },
                data: { status: 'accepted' },
            })
            return
        }

        // Create membership and update invitation status in transaction
        await this.prisma.$transaction([
            // Add user to organization
            this.prisma.organization_members.create({
                data: {
                    organization_id: invitation.organization_id,
                    user_id: this.userContext.id,
                    role: invitation.role,
                    invited_by: invitation.invited_by,
                },
            }),
            // Update invitation status
            this.prisma.organization_invitations.update({
                where: { id: invitationId },
                data: { status: 'accepted' },
            }),
        ])
    }

    // Decline invitation
    async declineInvitation(invitationId: string): Promise<void> {
        // Fetch invitation
        const invitation = await this.prisma.organization_invitations.findUnique({
            where: { id: invitationId },
        })

        if (!invitation) {
            throw new NotFoundError('Invitation not found')
        }

        // Get user's email to verify
        const profile = await this.prisma.profiles.findUnique({
            where: { id: this.userContext.id },
            select: { email: true },
        })

        if (!profile || profile.email !== invitation.email) {
            throw new ValidationError('This invitation is not for you')
        }

        // ABAC check - can user decline this invitation?
        requireAuthorization({
            user: this.userContext,
            action: 'update',
            resource: {
                type: 'invitation',
                id: invitationId,
                organizationId: invitation.organization_id,
                targetUserId: this.userContext.id,
            },
        })

        // Update status to declined
        await this.prisma.organization_invitations.update({
            where: { id: invitationId },
            data: { status: 'declined' },
        })
    }

    // Cancel invitation (owner/moderator only)
    async cancelInvitation(invitationId: string): Promise<void> {
        // Fetch invitation
        const invitation = await this.prisma.organization_invitations.findUnique({
            where: { id: invitationId },
        })

        if (!invitation) {
            throw new NotFoundError('Invitation not found')
        }

        // ABAC check - can user cancel this invitation?
        requireAuthorization({
            user: this.userContext,
            action: 'delete',
            resource: {
                type: 'invitation',
                id: invitationId,
                organizationId: invitation.organization_id,
            },
        })

        // Update status to cancelled
        await this.prisma.organization_invitations.update({
            where: { id: invitationId },
            data: { status: 'cancelled' },
        })
    }

    //=========================== DELETE OPERATIONS ============================

    // Delete invitation (hard delete - owner/moderator only)
    async deleteInvitation(invitationId: string): Promise<void> {
        // Fetch invitation
        const invitation = await this.prisma.organization_invitations.findUnique({
            where: { id: invitationId },
        })

        if (!invitation) {
            throw new NotFoundError('Invitation not found')
        }

        // ABAC check - can user delete this invitation?
        requireAuthorization({
            user: this.userContext,
            action: 'delete',
            resource: {
                type: 'invitation',
                id: invitationId,
                organizationId: invitation.organization_id,
            },
        })

        // Hard delete
        await this.prisma.organization_invitations.delete({
            where: { id: invitationId },
        })
    }
}
