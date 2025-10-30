// Base dal repository class with clients & user context already passed
import { Repository } from '../base/repository'

// Authorizor wrapper to validate users
import { requireAuthorization } from '@/lib/abac/authorizer'

// Custom error classes
import { NotFoundError } from '../utils/errors'

// organization_members interface for type safety
import type { organization_members } from '@/generated/prisma'

// What fields can user provide when adding member
type MemberCreateData = {
    organizationId: string
    userId: string
    role?: 'owner' | 'moderator' | 'member'
}

// What fields can user update (role changes only)
type MemberUpdateData = {
    role: 'owner' | 'moderator' | 'member'
}

export class OrganizationMemberRepository extends Repository {
    //=========================== READ OPERATIONS ============================

    // Get all members of an organization with user profiles
    async getOrganizationMembers(organizationId: string) {
        // ABAC check - can user list members of this org?
        requireAuthorization({
            user: this.userContext,
            action: 'list',
            resource: {
                type: 'organization_member',
                organizationId,
            },
        })

        // Fetch all members with user profiles included
        return await this.prisma.organization_members.findMany({
            where: {
                organization_id: organizationId,
            },
            include: {
                user: true,
            },
            orderBy: { joined_at: 'asc' },
        })
    }

    // Get specific member by ID
    async getMember(memberId: string): Promise<organization_members | null> {
        const member = await this.prisma.organization_members.findUnique({
            where: { id: memberId },
        })

        if (!member) {
            return null
        }

        // ABAC check - can user read this member?
        requireAuthorization({
            user: this.userContext,
            action: 'read',
            resource: {
                type: 'organization_member',
                id: memberId,
                organizationId: member.organization_id,
            },
        })

        return member
    }

    // Get user's membership in a specific org
    async getUserMembership(organizationId: string): Promise<organization_members | null> {
        return await this.prisma.organization_members.findUnique({
            where: {
                organization_id_user_id: {
                    organization_id: organizationId,
                    user_id: this.userContext.id,
                },
            },
        })
    }

    //=========================== CREATE OPERATIONS ============================

    // Add member to organization (used for invitations)
    async addMember(data: MemberCreateData): Promise<organization_members> {
        // ABAC check - can user add members to this org?
        requireAuthorization({
            user: this.userContext,
            action: 'create',
            resource: {
                type: 'organization_member',
                organizationId: data.organizationId,
                targetUserId: data.userId,
                targetRole: data.role || 'member',
            },
        })

        // Add new member (will fail if already exists due to UNIQUE constraint)
        const member = await this.prisma.organization_members.create({
            data: {
                organization_id: data.organizationId,
                user_id: data.userId,
                role: data.role || 'member',
                invited_by: this.userContext.id,
            },
        })

        return member
    }

    //=========================== UPDATE OPERATIONS ============================

    // Update member role (owner/moderator can change roles)
    async updateMemberRole(memberId: string, newRole: MemberUpdateData['role']): Promise<organization_members> {
        // Fetch member to get org context
        const member = await this.prisma.organization_members.findUnique({
            where: { id: memberId },
        })

        if (!member) {
            throw new NotFoundError('Member not found')
        }

        // ABAC check - can user update this member's role?
        requireAuthorization({
            user: this.userContext,
            action: 'update',
            resource: {
                type: 'organization_member',
                id: memberId,
                organizationId: member.organization_id,
                targetUserId: member.user_id,
                newRole,
            },
        })

        // Update role
        const updatedMember = await this.prisma.organization_members.update({
            where: { id: memberId },
            data: { role: newRole },
        })

        return updatedMember
    }

    //=========================== DELETE OPERATIONS ============================

    // Remove member from organization (hard delete)
    async removeMember(memberId: string): Promise<void> {
        // Fetch member to get org context
        const member = await this.prisma.organization_members.findUnique({
            where: { id: memberId },
        })

        if (!member) {
            throw new NotFoundError('Member not found')
        }

        // ABAC check - can user remove this member?
        requireAuthorization({
            user: this.userContext,
            action: 'delete',
            resource: {
                type: 'organization_member',
                id: memberId,
                organizationId: member.organization_id,
                targetUserId: member.user_id,
            },
        })

        // Hard delete member
        await this.prisma.organization_members.delete({
            where: { id: memberId },
        })
    }

    // Leave organization (user removes themselves - hard delete)
    async leaveOrganization(organizationId: string): Promise<void> {
        // Find user's membership
        const member = await this.prisma.organization_members.findUnique({
            where: {
                organization_id_user_id: {
                    organization_id: organizationId,
                    user_id: this.userContext.id,
                },
            },
        })

        if (!member) {
            throw new NotFoundError('You are not a member of this organization')
        }

        // ABAC check - can user leave this org?
        requireAuthorization({
            user: this.userContext,
            action: 'delete',
            resource: {
                type: 'organization_member',
                id: member.id,
                organizationId: organizationId,
                targetUserId: this.userContext.id,
            },
        })

        // Hard delete membership
        await this.prisma.organization_members.delete({
            where: { id: member.id },
        })
    }
}
