'use server'

// import supabase server
import { createClient } from '@/lib/supabase/server'

// Arcjet import
import { headers } from 'next/headers'
import arcjet, { slidingWindow, detectBot } from '@arcjet/next'

// Arcjet configuration for invitation handling protection
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: 'LIVE', allow: [] }),
    slidingWindow({ mode: 'LIVE', interval: '1m', max: 10 }) // 10 invitation actions per minute
  ]
})

export async function acceptInvitation(invitationId: string) {
    // Arcjet protection
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error('Too many invitation actions. Please try again later.')
        }
        throw new Error('Request blocked')
    }

    const supabase = await createClient() // initialize supabase client

    // Call the SQL function to accept invitation
    const { data, error } = await supabase.rpc('accept_invitation', {
        invitation_id: invitationId
    })

    // throw error if supabase said so
    if (error) {
        throw new Error(error.message)
    }

    return { success: data }
}

export async function declineInvitation(invitationId: string) {
    // Arcjet protection
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error('Too many invitation actions. Please try again later.')
        }
        throw new Error('Request blocked')
    }

    const supabase = await createClient() // initialize supabase client

    // Call the SQL function to decline invitation
    const { data, error } = await supabase.rpc('decline_invitation', {
        invitation_id: invitationId
    })

    // throw error if supabase said so
    if (error) {
        throw new Error(error.message)
    }

    return { success: data }
}