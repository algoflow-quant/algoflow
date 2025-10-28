'use server'

import { buildUserContext } from '@/lib/dal/context'
import { ProfileRepository } from '@/lib/dal/repositories/profile.repository'

/**
 * Update current user's last_seen_at timestamp
 * Uses DAL + ABAC for authorization
 */
export async function updateLastSeen() {
  const userContext = await buildUserContext()
  if (!userContext) {
    throw new Error('Not authenticated')
  }

  const profileRepo = new ProfileRepository(userContext)
  await profileRepo.updateLastSeen()

  return { success: true }
}
