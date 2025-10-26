'use server'

// Supabase import
import { createClient } from '@/server/supabase/server'

// Helpers
import {
  revalidateAndRedirect,
} from './helpers'

/**
 * Sign out current user
 */
export async function logout() {
  // Get Supabase client
  const supabase = await createClient()

  // Sign out
  await supabase.auth.signOut()

  // Redirect to home
  await revalidateAndRedirect('/')
}
