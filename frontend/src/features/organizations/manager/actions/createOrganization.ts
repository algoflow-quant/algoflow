"use server"

// DAL imports
import { buildUserContext } from '@/lib/dal/context'
import { OrganizationRepository } from '@/lib/dal/repositories/organization.repository'

// Next.js imports
import { headers } from "next/headers"

// Arcjet rate limiting imports
import arcjet, { slidingWindow, detectBot } from "@arcjet/next"

// Arcjet configuration - prevent abuse
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: "LIVE", allow: [] }),
    slidingWindow({
      mode: "LIVE",
      interval: "1h",
      max: 10  // Max 10 organization creation attempts per hour
    }),
  ],
})

/**
 * Create Organization server action
 * Uses DAL + ABAC for authorization and data access
 * ABAC automatically enforces free org limit (1 per user)
 */
async function createOrganization(formData: FormData) {
    // Step 1: Arcjet rate limiting protection
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error("Too many organization creation attempts. Please try again later.")
        }
        throw new Error("Request blocked. Please try again.")
    }

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