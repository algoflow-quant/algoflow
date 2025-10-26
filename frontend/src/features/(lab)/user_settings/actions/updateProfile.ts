'use server'

import { createClient } from '@/server/supabase/server'
import { revalidatePath } from 'next/cache'
import arcjet, { detectBot, slidingWindow } from '@arcjet/next'
import { headers } from 'next/headers'

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: 'LIVE', allow: [] }),
    slidingWindow({ mode: 'LIVE', interval: '1m', max: 10 }),
  ],
})

export async function updateFullName(fullName: string) {
  const headersList = await headers()
  const decision = await aj.protect({ headers: headersList })

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      throw new Error('Too many requests. Please try again later.')
    }
    throw new Error('Request blocked')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to update your profile')
  }

  // Update user metadata
  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/lab')

  return { success: true }
}

export async function updateAvatarUrl(avatarUrl: string) {
  const headersList = await headers()
  const decision = await aj.protect({ headers: headersList })

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      throw new Error('Too many requests. Please try again later.')
    }
    throw new Error('Request blocked')
  }

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

  revalidatePath('/lab')

  return { success: true }
}
