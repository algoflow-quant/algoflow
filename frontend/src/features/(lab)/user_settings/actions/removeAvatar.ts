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

export async function removeAvatar() {
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
    throw new Error('You must be logged in to remove your avatar')
  }

  // Delete all avatars from storage
  const { data: existingFiles } = await supabase.storage
    .from('avatars')
    .list(user.id)

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map((file) => `${user.id}/${file.name}`)
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove(filesToDelete)

    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }

  // Remove avatar URL from user metadata
  const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url: null },
  })

  if (updateError) {
    throw new Error(updateError.message)
  }

  // Remove avatar URL from profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id)

  if (profileError) {
    throw new Error(profileError.message)
  }

  revalidatePath('/lab')

  return { success: true }
}
