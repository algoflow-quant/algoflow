'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { protectAction } from '@/lib/arcjet'

export async function deleteAccount(password: string) {
  await protectAction('deleteAccount')

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    throw new Error('You must be logged in to delete your account')
  }

  // Verify password before deletion
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: password,
  })

  if (signInError) {
    throw new Error('Password is incorrect')
  }

  // Delete user account using Supabase Admin API with service role client
  const supabaseAdmin = createServiceRoleClient()
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)

  if (error) {
    throw new Error(error.message)
  }

  // Sign out and redirect
  await supabase.auth.signOut()
  redirect('/')
}
