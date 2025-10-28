'use server'

// DAL imports
import { buildUserContextWithOrg } from '@/lib/dal/context'
import { OrganizationMemberRepository } from '@/lib/dal/repositories'

// Type imports
import type { OrganizationMember } from '../types'

/**
 * Get members server action - fully using DAL with single profiles table
 */
export async function getMembers(organizationId: string): Promise<OrganizationMember[]> {
    // Build user context with organization membership
    const userContext = await buildUserContextWithOrg(organizationId)

    if (!userContext) {
        throw new Error('Not authenticated')
    }

    // Use DAL to fetch members with profiles included (ABAC checks permissions)
    const memberRepo = new OrganizationMemberRepository(userContext)
    const membersWithProfiles = await memberRepo.getOrganizationMembers(organizationId)

    if (!membersWithProfiles || membersWithProfiles.length === 0) {
        return []
    }

    // Map to OrganizationMember type (profile data already included)
    const members = membersWithProfiles.map(member => ({
        id: member.id,
        organization_id: member.organization_id,
        user_id: member.user_id,
        role: member.role as 'owner' | 'moderator' | 'member',
        invited_by: member.invited_by,
        joined_at: member.joined_at.toISOString(),
        updated_at: member.updated_at.toISOString(),
        profiles: {
            username: member.user.username,
            full_name: member.user.full_name,
            avatar_url: member.user.avatar_url,
            email: member.user.email,
            last_seen_at: member.user.last_seen_at?.toISOString() || null,
        }
    }))

    return members
}
