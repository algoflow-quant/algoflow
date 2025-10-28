'use server'

import { buildUserContextWithOrg } from '@/lib/dal/context'
import { OrganizationMemberRepository } from '@/lib/dal/repositories'

/**
 * Check if current user is still a member of an organization
 * Uses DAL + ABAC for authorization
 */
export async function checkMembership(organizationId: string): Promise<boolean> {
  const userContext = await buildUserContextWithOrg(organizationId)

  // If buildUserContextWithOrg succeeds, user is a member
  // It throws if user is not a member (see context.ts line 50-58)
  return !!userContext
}
