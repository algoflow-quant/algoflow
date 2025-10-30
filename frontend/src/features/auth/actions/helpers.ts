'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { LoginCredentials, SignupData } from '../types'

/**
 * Extract login credentials from FormData
 */
export async function extractLoginData(formData: FormData): Promise<LoginCredentials> {
  return {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
}

/**
 * Extract signup data from FormData
 */
export async function extractSignupData(formData: FormData): Promise<SignupData> {
  return {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
    username: formData.get('username') as string,
  }
}

/**
 * Revalidate auth-related paths and redirect
 */
export async function revalidateAndRedirect(path: string = '/') {
  revalidatePath('/', 'layout')
  redirect(path)
}

/**
 * Handle authentication errors with user-friendly messages
 */
export async function handleAuthError(error: any, isSignup: boolean = false) {
  console.error('Auth error:', error)

  // Map Supabase error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    // Login errors
    'invalid_credentials': 'Invalid email or password. Please try again.',
    'email_not_confirmed': 'Please verify your email address before logging in.',
    'user_not_found': 'No account found with this email address.',
    'invalid_grant': 'Invalid email or password. Please try again.',
    'user_banned': 'This account has been suspended. Please contact support.',
    'over_request_rate_limit': 'Too many attempts. Please try again later.',

    // Signup errors
    'user_already_exists': 'An account with this email already exists.',
    'email_exists': 'An account with this email already exists.',
    'weak_password': 'Password is too weak. Please use at least 8 characters.',
    'invalid_email': 'Please enter a valid email address.',
    'password_too_short': 'Password must be at least 8 characters long.',
  }

  // Get user-friendly message or use default
  const message = errorMessages[error.code] || error.message || `An error occurred during ${isSignup ? 'signup' : 'login'}`

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message)

  // Redirect to appropriate page with error message
  const redirectPath = isSignup ? '/signup' : '/login'
  redirect(`${redirectPath}?error=${encodedMessage}`)
}
