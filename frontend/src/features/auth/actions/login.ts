'use server'

// Supabase import
import { createClient } from '@/lib/supabase/server'

// Arcjet import
import { protectAction } from '@/lib/arcjet'

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
  // Arcjet protection against brute force
  await protectAction('login')

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

  // Success - redirect to dashboard
  await revalidateAndRedirect('/dashboard')
}
