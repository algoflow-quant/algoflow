'use server'

import { buildUserContext } from '@/lib/dal/context'
import { ProfileRepository } from '@/lib/dal/repositories/profile.repository'

/**
 * Get user's avatar data (avatar_url, full_name for fallback initials)
 * Used by AvatarDropdown component
 */
export async function getUserAvatar(userId: string) {
  // Step 1: Build user context from current session
  const userContext = await buildUserContext()

  // Step 2: If no session, return null
  if (!userContext) {
    return null
  }

  // Step 3: Create repository with user context
  const profileRepo = new ProfileRepository(userContext)

  // Step 4: Fetch public profile (ABAC checks permission inside)
  const profile = await profileRepo.getProfile(userId)

  // Step 5: Return only avatar-related data
  if (!profile) {
    return null
  }

  return {
    avatar_url: profile.avatar_url,
    full_name: profile.full_name,
    username: profile.username,
  }
}
