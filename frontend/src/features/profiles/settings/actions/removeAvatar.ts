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
    slidingWindow({ mode: 'LIVE', interval: '1m', max: 10 }),
  ],
})

export async function removeAvatar() {
  const headersList = await headers()
  const decision = await aj.protect({ headers: headersList })

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      throw new Error('Too many requests. Please try again later.')
    }
    throw new Error('Request blocked')
  }

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
