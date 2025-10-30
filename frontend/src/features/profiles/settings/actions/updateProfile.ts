'use server'

import { revalidatePath } from 'next/cache'
import { protectAction } from '@/lib/arcjet'
import { ProfileRepository } from '@/lib/dal/repositories'
import { buildUserContext } from '@/lib/dal/context'
import { createClient } from '@/lib/supabase/server'

export async function updateFullName(fullName: string) {
  await protectAction('updateProfile')

  // Build user context for ABAC
  const userContext = await buildUserContext()
  if (!userContext) {
    throw new Error('You must be logged in to update your profile')
  }

  // Use repository for profile update with ABAC
  const profileRepo = new ProfileRepository(userContext)
  await profileRepo.updateProfile({ full_name: fullName })

  // Also update Supabase Auth metadata for consistency
  const supabase = await createClient()
  await supabase.auth.updateUser({
    data: { full_name: fullName },
  })

  revalidatePath('/dashboard')

  return { success: true }
}

export async function updateUsername(username: string) {
  await protectAction('updateProfile')

  // Build user context for ABAC
  const userContext = await buildUserContext()
  if (!userContext) {
    throw new Error('You must be logged in to update your profile')
  }

  // Use repository for profile update with ABAC (includes uniqueness check)
  const profileRepo = new ProfileRepository(userContext)
  await profileRepo.updateProfile({ username })

  revalidatePath('/dashboard')

  return { success: true }
}

export async function updateBio(bio: string) {
  await protectAction('updateProfile')

  // Build user context for ABAC
  const userContext = await buildUserContext()
  if (!userContext) {
    throw new Error('You must be logged in to update your profile')
  }

  // Use repository for profile update with ABAC
  const profileRepo = new ProfileRepository(userContext)
  await profileRepo.updateProfile({ bio })

  revalidatePath('/dashboard')

  return { success: true }
}

// Deprecated - only used internally by uploadAvatar, kept for backwards compatibility
export async function updateAvatarUrl(avatarUrl: string) {
  await protectAction('updateProfile')

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to update your profile')
  }

  // Update user metadata
  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard')

  return { success: true }
}
