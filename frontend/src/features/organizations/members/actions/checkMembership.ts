'use server'

import { buildUserContextWithOrg } from '@/lib/dal/context'

/**
 * Check if current user is still a member of an organization
 * Uses DAL + ABAC for authorization
 */
export async function checkMembership(organizationId: string): Promise<boolean> {
  const userContext = await buildUserContextWithOrg(organizationId)

  // Check if user has organization context (organizationId and organizationRole are set)
  // If they're undefined, user is not a member
  return !!(userContext?.organizationId && userContext?.organizationRole)
}
