"use server"

// DAL imports
import { buildUserContext } from '@/lib/dal/context'
import { OrganizationRepository } from '@/lib/dal/repositories/organization.repository'
import { protectAction } from '@/lib/arcjet'

/**
 * Create Organization server action
 * Uses DAL + ABAC for authorization and data access
 * ABAC automatically enforces free org limit (1 per user)
 */
async function createOrganization(formData: FormData) {
    // Step 1: Arcjet rate limiting protection
    await protectAction('createOrganization')

    // Step 2: Build user context (includes auth check + role loading)
    const userContext = await buildUserContext()
    if (!userContext) {
        throw new Error('Not authenticated')
    }

    // Step 3: Extract and validate form data
    const name = formData.get('name') as string
    if (!name || name.trim().length === 0) {
        throw new Error('Organization name is required')
    }

    const selectedPlan = formData.get('plan') as string || 'free'
    const selectedType = formData.get('type') as string || 'n/a'

    // Note: Plan and type validation handled by database CHECK constraints
    // Invalid values will throw Prisma error automatically

    // Step 4: Handle payment for paid plans (admins bypass this)
    if (selectedPlan !== 'free' && userContext.globalRole !== 'admin') {
        // Redirect to checkout for paid plans
        throw new Error('redirect_to_checkout')
    }

    // Step 5: Create organization using DAL
    // ABAC automatically enforces:
    // - Free org limit (1 per user)
    // - Paid org limit (unlimited)
    // - Admin bypass for all limits
    const orgRepo = new OrganizationRepository(userContext)
    const organization = await orgRepo.createOrganization({
        name: name.trim(),
        plan: selectedPlan,
        type: selectedType,
    })

    // Step 6: Return created organization
    return organization
}

export { createOrganization }