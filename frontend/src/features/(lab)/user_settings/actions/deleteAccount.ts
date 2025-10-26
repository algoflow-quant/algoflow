'use server'

import { createClient, createServiceRoleClient } from '@/server/supabase/server'
import { redirect } from 'next/navigation'
import arcjet, { detectBot, slidingWindow } from '@arcjet/next'
import { headers } from 'next/headers'

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: 'LIVE', allow: [] }),
    slidingWindow({ mode: 'LIVE', interval: '1m', max: 3 }),
  ],
})

export async function deleteAccount(password: string) {
  const headersList = await headers()
  const decision = await aj.protect({ headers: headersList })

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      throw new Error('Too many requests. Please try again later.')
    }
    throw new Error('Request blocked')
  }

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
