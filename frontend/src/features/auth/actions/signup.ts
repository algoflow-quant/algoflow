'use server'

// Supabase import
import { createClient } from '@/lib/supabase/server'

// Arcjet import
import { protectAction } from '@/lib/arcjet'

// import helpers
import {
  extractSignupData,
  revalidateAndRedirect,
  handleAuthError,
} from './helpers'

/**
 * Register new user account
 */
export async function signup(formData: FormData) {
  // Extract signup data from form
  const signupData = await extractSignupData(formData)

  // Arcjet protection
  await protectAction('signup', { email: signupData.email })

  // Get Supabase client
  const supabase = await createClient()

  // Prepare signup payload
  const payload = {
    email: signupData.email,
    password: signupData.password,
    options: {
      data: {
        full_name: signupData.name,
        username: signupData.username,
      },
    },
  }

  // Attempt signup
  const { error } = await supabase.auth.signUp(payload)

  // Handle errors
  if (error) {
    await handleAuthError(error, true)  // true = isSignup
  }

  // Success - redirect to dashboard
  await revalidateAndRedirect('/dashboard')
}
