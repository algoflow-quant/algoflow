'use server'

import { revalidatePath } from 'next/cache'
import { protectAction } from '@/lib/arcjet'
import { ProfileRepository } from '@/lib/dal/repositories'
import { buildUserContext } from '@/lib/dal/context'
import { createClient } from '@/lib/supabase/server'

export async function uploadAvatar(formData: FormData) {
  await protectAction('uploadAvatar')

  const file = formData.get('file') as File

  if (!file) {
    throw new Error('No file provided')
  }

  // Build user context for ABAC
  const userContext = await buildUserContext()
  if (!userContext) {
    throw new Error('You must be logged in to upload an avatar')
  }

  // Use repository for avatar upload with ABAC
  const profileRepo = new ProfileRepository(userContext)
  const { avatarUrl } = await profileRepo.uploadAvatar(file)

  // Also update Supabase Auth metadata for consistency
  const supabase = await createClient()
  await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  })

  revalidatePath('/dashboard')

  return { success: true, avatarUrl }
}
