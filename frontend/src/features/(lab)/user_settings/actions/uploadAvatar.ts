'use server'

import { createClient } from '@/server/supabase/server'
import { revalidatePath } from 'next/cache'
import arcjet, { detectBot, slidingWindow } from '@arcjet/next'
import { headers } from 'next/headers'

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

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to upload an avatar')
  }

  const file = formData.get('file') as File

  if (!file) {
    throw new Error('No file provided')
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Allowed: JPEG, PNG, GIF, WEBP')
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB')
  }

  // Get file extension
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const fileName = `${user.id}/avatar-${timestamp}.${fileExt}`

  // Delete old avatars if exist
  const { data: existingFiles } = await supabase.storage
    .from('avatars')
    .list(user.id)

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map((file) => `${user.id}/${file.name}`)
    await supabase.storage.from('avatars').remove(filesToDelete)
  }

  // Upload new avatar
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(fileName)

  // Update user metadata with new avatar URL
  const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  })

  if (updateError) {
    throw new Error(updateError.message)
  }

  // Also update profiles table so members page shows updated avatar
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (profileError) {
    throw new Error(profileError.message)
  }

  revalidatePath('/lab')

  return { success: true, avatarUrl: publicUrl }
}
