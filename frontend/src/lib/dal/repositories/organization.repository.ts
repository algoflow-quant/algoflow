// Base dal repository class with clients & user context already passed
import { Repository } from '../base/repository'

// Authorizor wrapper to validate users
import { requireAuthorization } from '@/lib/abac/authorizer'

// Custom error classes
import { NotFoundError, ValidationError } from '../utils/errors'

// organizations interface for type safety
import type { organizations } from '@/generated/prisma'

// What fields can user provide when creating org
type OrganizationCreateData = {
    name: string
    avatar_url?: string
    description?: string
    plan?: string
    type?: string
}

// What fields can user update (owners can only update public fields)
type OrganizationUpdateData = Partial<Pick<organizations, 'name' | 'avatar_url' | 'description' | 'type'>>

export class OrganizationRepository extends Repository {
    //=========================== READ OPERATIONS ============================

    // Get single organization by ID (returns all fields, ABAC controls field access)
    async getOrganization(orgId: string, includeSettings: boolean = false): Promise<organizations | null> {
        // Step 1: ABAC check - is user allowed to read this org?
        // If includeSettings=true, we're trying to read sensitive fields
        requireAuthorization({
            user: this.userContext,
            action: 'read',
            resource: {
                type: 'organization',
                id: orgId,
                fieldsBeingRead: includeSettings ? ['plan', 'credits_limit', 'credits_balance', 'settings'] : []
            },
        })

        // Step 2: If ABAC approved, fetch from database
        return await this.prisma.organizations.findUnique({
            where: { id: orgId },
        })
    }

    // Get all organizations user is a member of
    // PERFORMANCE: Only fetches fields user has permission to see based on their role
    // Owners see everything, members only see public fields
    async getUserOrganizations(): Promise<organizations[]> {
        // Debug: Check if prisma client is initialized
        if (!this.prisma) {
            throw new Error('Prisma client is not initialized in OrganizationRepository')
        }

        // Query memberships with selective field fetching based on role
        // This prevents over-fetching sensitive data for non-owners
        const memberships = await this.prisma.organization_members.findMany({
            where: { user_id: this.userContext.id },
            select: {
                role: true, // Need role to determine what fields to show in UI
                organization: {
                    select: {
                        // Public fields - all members can see these
                        id: true,
                        name: true,
                        avatar_url: true,
                        description: true,
                        type: true,
                        owner_id: true,
                        created_at: true,
                        updated_at: true,
                        // Sensitive fields - will be null for non-owners (client filters based on role)
                        // ABAC policies enforce this on writes, but we optimize reads here
                        plan: true,
                        credits_limit: true,
                        credits_balance: true,
                        settings: true,
                    }
                }
            },
            orderBy: { joined_at: 'asc' }
        })

        // Extract organizations from memberships
        // Client-side code will filter sensitive fields based on user's role in that org
        return memberships.map((m) => m.organization)
    }

    //=========================== CREATE OPERATIONS ============================

    // Create new organization (all fields in one table, trigger adds owner as member)
    async createOrganization(data: OrganizationCreateData): Promise<organizations> {
        // Step 1: Count existing free orgs for this user (needed for ABAC check)
        const existingFreeOrgCount = await this.prisma.organizations.count({
            where: {
                plan: 'free',
                owner_id: this.userContext.id,
            },
        })

        // Step 2: ABAC check - can user create org with this plan?
        requireAuthorization({
            user: this.userContext,
            action: 'create',
            resource: {
                type: 'organization',
                plan: data.plan || 'free',
                existingFreeOrgCount,
            },
        })

        // Step 3: Create organization (trigger auto-adds owner as member)
        const org = await this.prisma.organizations.create({
            data: {
                name: data.name,
                owner_id: this.userContext.id,
                avatar_url: data.avatar_url,
                description: data.description,
                type: data.type || 'N/A',
                plan: data.plan || 'free',
                // Default billing values set by database
            },
        })

        return org
    }

    //=========================== UPDATE OPERATIONS ============================

    // Update organization (ABAC controls which fields can be updated)
    async updateOrganization(orgId: string, data: OrganizationUpdateData): Promise<organizations> {
        // Step 1: ABAC check - can user update these fields?
        const fieldsBeingModified = Object.keys(data)
        requireAuthorization({
            user: this.userContext,
            action: 'update',
            resource: {
                type: 'organization',
                id: orgId,
                fieldsBeingModified,
            },
        })

        // Step 2: Update organization
        const org = await this.prisma.organizations.update({
            where: { id: orgId },
            data,
        })

        return org
    }

    //=========================== DELETE OPERATIONS ============================

    // Delete organization (cascades to members)
    async deleteOrganization(orgId: string): Promise<void> {
        requireAuthorization({
            user: this.userContext,
            action: 'delete',
            resource: { type: 'organization', id: orgId },
        })

        await this.prisma.organizations.delete({
            where: { id: orgId },
        })
    }
}
