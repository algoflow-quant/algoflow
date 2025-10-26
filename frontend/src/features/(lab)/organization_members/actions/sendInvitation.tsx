'use server'

// Supabase client
import { createClient } from '@/server/supabase/server'

// Next.js imports
import { headers } from 'next/headers'

// Arcjet imports
import arcjet, { slidingWindow, detectBot } from '@arcjet/next'

// Arcjet configuration
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: 'LIVE', allow: [] }),
    slidingWindow({
      mode: 'LIVE',
      interval: '1m',
      max: 20 // Max 10 invitations per hour per user
    })
  ]
})

interface SendInvitationParams {
    organizationId: string
    email: string
    role: 'member' | 'moderator'
}

export async function sendInvitation({ organizationId, email, role }: SendInvitationParams) {
    // Rate limiting with Arcjet
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error('Too many invitations. Please try again later.')
        }
        throw new Error('Request blocked')
    }

    const supabase = await createClient() // create supabase client

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // throw error if not logged in
    if (userError || !user) {
        throw new Error('You must be logged in to send invitations')
    }

    // Create the invitation
    const { data, error } = await supabase
        .from('organization_invitations')
        .insert({
        organization_id: organizationId,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
        })
        .select()
        .single()

    // throw error if caught from supabase
    if (error) {
        throw new Error(error.message)
    }

    return data
}