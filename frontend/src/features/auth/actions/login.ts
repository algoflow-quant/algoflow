'use server'

// Supabase import
import { createClient } from '@/server/supabase/server'

// Helpers
import {
  extractLoginData,
  revalidateAndRedirect,
  handleAuthError,
} from './helpers'

/**
 * Authenticate user with email and password
 */
export async function login(formData: FormData) {
  // Extract credentials from form
  const credentials = await extractLoginData(formData)

  // Get Supabase client
  const supabase = await createClient()

  // Attempt login
  const { error } = await supabase.auth.signInWithPassword(credentials)

  // Handle errors
  if (error) {
    await handleAuthError(error)
  }

  // Success - redirect to lab
  await revalidateAndRedirect('/lab')
}
