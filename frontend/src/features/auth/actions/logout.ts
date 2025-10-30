'use server'

// Supabase import
import { createClient } from '@/lib/supabase/server'

// Update last seen action
import { updateLastSeen } from '@/features/organizations/members/actions/updateLastSeen'

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

  // Update last_seen_at before logout (using DAL + ABAC)
  try {
    await updateLastSeen()
  } catch (error) {
    console.error('[Logout] Failed to update last_seen_at:', error)
  }

  // Sign out
  await supabase.auth.signOut()

  // Redirect to home
  await revalidateAndRedirect('/')
}
