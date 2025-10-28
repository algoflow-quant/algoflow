'use server'

// Supabase import
import { createClient } from '@/lib/supabase/server'

// import arcjet
import arcjet, { protectSignup } from "@arcjet/next"

// import helpers
import {
  extractSignupData,
  revalidateAndRedirect,
  handleAuthError,
} from './helpers'

// Next js imports
import { headers } from "next/headers"

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    protectSignup({
      email: {
        mode: "LIVE",
        block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
      },
      bots: {
        mode: "LIVE",
        allow: [],
      },
      rateLimit: {
        mode: "LIVE",
        interval: "10m",
        max: 5,
      },
    }),
  ],
})

/**
 * Register new user account
 */
export async function signup(formData: FormData) {
  // Extract signup data from form
  const signupData = await extractSignupData(formData)

  // Arcjet protection
  const headersList = await headers()
  const decision = await aj.protect(
    { headers: headersList },
    { email: signupData.email }
  )

  if (decision.isDenied()) {
    if (decision.reason.isEmail()) {
      throw new Error("Invalid email address")
    } else if (decision.reason.isRateLimit()) {
      throw new Error("Too many signup attempts. Please try again later.")
    } else {
      throw new Error("Signup blocked. Please try again.")
    }
  }

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
    await handleAuthError(error)
  }

  // Success - redirect to dashboard
  await revalidateAndRedirect('/dashboard')
}
