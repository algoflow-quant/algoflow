'use server'

import { createClient } from '@/lib/supabase/server'
import { protectAction } from '@/lib/arcjet'

export async function updatePassword(currentPassword: string, newPassword: string) {
  await protectAction('updatePassword')

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
