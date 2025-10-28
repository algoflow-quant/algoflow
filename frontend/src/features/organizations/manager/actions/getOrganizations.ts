"use server"

import { buildUserContext } from '@/lib/dal/context'
import { OrganizationRepository } from '@/lib/dal/repositories/organization.repository'

/**
 * Get all organizations user is a member of (public data only)
 * Uses DAL + ABAC for authorization
 * Returns public organization data (no plan/credits - those are owner/admin only)
 */
export async function getOrganizations() {
    // Step 1: Build user context (includes auth check)
    const userContext = await buildUserContext()

    if (!userContext) {
        throw new Error('Not authenticated')
    }

    // Step 2: Use DAL to get organizations (public data only)
    const orgRepo = new OrganizationRepository(userContext)
    const organizations = await orgRepo.getUserOrganizations()

    // Step 3: Return public organization data
    return organizations
}