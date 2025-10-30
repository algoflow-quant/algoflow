'use server'

import { revalidatePath } from 'next/cache'
import { protectAction } from '@/lib/arcjet'
import { ProfileRepository } from '@/lib/dal/repositories'
import { buildUserContext } from '@/lib/dal/context'
import { createClient } from '@/lib/supabase/server'

export async function removeAvatar() {
  await protectAction('removeAvatar')

  // Build user context for ABAC
  const userContext = await buildUserContext()
  if (!userContext) {
    throw new Error('You must be logged in to remove your avatar')
  }

  // Use repository for avatar removal with ABAC
  const profileRepo = new ProfileRepository(userContext)
  await profileRepo.removeAvatar()

  // Also update Supabase Auth metadata for consistency
  const supabase = await createClient()
  await supabase.auth.updateUser({
    data: { avatar_url: null },
  })

  revalidatePath('/dashboard')

  return { success: true }
}
