'use server'

// DAL imports
import { buildUserContextWithOrg } from '@/lib/dal/context'
import { OrganizationMemberRepository } from '@/lib/dal/repositories'
import { protectAction } from '@/lib/arcjet'

/**
 * Remove member from organization - refactored to use DAL
 */
export async function removeMember(organizationId: string, userId: string) {
    // Arcjet rate limiting
    await protectAction('manageMember')

    // Build user context with organization membership
    const userContext = await buildUserContextWithOrg(organizationId)

    if (!userContext) {
        throw new Error('Not authenticated')
    }

    // Use DAL to remove member (ABAC handles all permission checks)
    const memberRepo = new OrganizationMemberRepository(userContext)

    // Find member ID by organization and user
    const members = await memberRepo.getOrganizationMembers(organizationId)
    const targetMember = members.find(m => m.user_id === userId)

    if (!targetMember) {
        throw new Error('Member not found')
    }

    await memberRepo.removeMember(targetMember.id)

    return { success: true }
}

/**
 * Update member role - refactored to use DAL
 */
export async function updateMemberRole(
    organizationId: string,
    userId: string,
    newRole: 'moderator' | 'member'
) {
    // Arcjet rate limiting
    await protectAction('manageMember')

    // Build user context with organization membership
    const userContext = await buildUserContextWithOrg(organizationId)

    if (!userContext) {
        throw new Error('Not authenticated')
    }

    // Use DAL to update member role (ABAC handles all permission checks)
    const memberRepo = new OrganizationMemberRepository(userContext)

    // Find member ID by organization and user
    const members = await memberRepo.getOrganizationMembers(organizationId)
    const targetMember = members.find(m => m.user_id === userId)

    if (!targetMember) {
        throw new Error('Member not found')
    }

    await memberRepo.updateMemberRole(targetMember.id, newRole)

    return { success: true }
}
