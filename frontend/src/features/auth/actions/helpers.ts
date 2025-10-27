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
 * Handle authentication errors
 */
export async function handleAuthError(error: any) {
  console.error('Auth error:', error)
  redirect('/error')
}
