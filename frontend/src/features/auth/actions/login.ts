'use server'

// Supabase import
import { createClient } from '@/server/supabase/server'

// Arcjet import
import { headers } from 'next/headers'
import arcjet, { slidingWindow, detectBot } from '@arcjet/next'

// Helpers
import {
  extractLoginData,
  revalidateAndRedirect,
  handleAuthError,
} from './helpers'

// Arcjet configuration for login protection
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: 'LIVE', allow: [] }),
    slidingWindow({ mode: 'LIVE', interval: '15m', max: 25 }) // 5 login attempts per 15 minutes
  ]
})

/**
 * Authenticate user with email and password
 */
export async function login(formData: FormData) {
  // Arcjet protection against brute force
  const headersList = await headers()
  const decision = await aj.protect({ headers: headersList })

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      throw new Error('Too many login attempts. Please try again in 15 minutes.')
    }
    throw new Error('Request blocked')
  }

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
