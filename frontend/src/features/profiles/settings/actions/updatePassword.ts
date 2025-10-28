'use server'

import { createClient } from '@/lib/supabase/server'
import arcjet, { detectBot, slidingWindow } from '@arcjet/next'
import { headers } from 'next/headers'

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: 'LIVE', allow: [] }),
    slidingWindow({ mode: 'LIVE', interval: '1m', max: 5 }),
  ],
})

export async function updatePassword(currentPassword: string, newPassword: string) {
  const headersList = await headers()
  const decision = await aj.protect({ headers: headersList })

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      throw new Error('Too many password change attempts. Please try again later.')
    }
    throw new Error('Request blocked')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    throw new Error('You must be logged in to change your password')
  }

  // Verify current password by attempting to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (signInError) {
    throw new Error('Current password is incorrect')
  }

  // Update password
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw new Error(error.message)
  }

  return { success: true }
}
