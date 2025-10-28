'use server'

import { revalidatePath } from 'next/cache'
import arcjet, { detectBot, slidingWindow } from '@arcjet/next'
import { headers } from 'next/headers'
import { ProfileRepository } from '@/lib/dal/repositories'
import { buildUserContext } from '@/lib/dal/context'
import { createClient } from '@/lib/supabase/server'

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: 'LIVE', allow: [] }),
    slidingWindow({ mode: 'LIVE', interval: '1m', max: 5 }),
  ],
})

export async function uploadAvatar(formData: FormData) {
  const headersList = await headers()
  const decision = await aj.protect({ headers: headersList })

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      throw new Error('Too many upload attempts. Please try again later.')
    }
    throw new Error('Request blocked')
  }

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
