'use server'

// supabase cleint
import { createClient } from '@/server/supabase/server'

// Arcjet import
import { headers } from 'next/headers'
import arcjet, { slidingWindow, detectBot } from '@arcjet/next'

// Arcjet configuration for notification actions protection
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: 'LIVE', allow: [] }),
    slidingWindow({ mode: 'LIVE', interval: '1m', max: 100 }) // 100 notification actions per minute
  ]
})

export async function markAsRead(notificationId: string) {
    // Arcjet protection
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error('Too many notification actions. Please try again later.')
        }
        throw new Error('Request blocked')
    }

    const supabase = await createClient() //initialize supabase client

    // mark notifcation ID read as true
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

    // throw error if supabse did that
    if (error) {
        throw new Error(error.message)
    }

    // return true
    return { success: true }
}

export async function markAllAsRead(userId: string) {
    // Arcjet protection
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error('Too many notification actions. Please try again later.')
        }
        throw new Error('Request blocked')
    }

    const supabase = await createClient() // create supabase client

    const { error } = await supabase // mark user id notifcations all as read
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

    //throw error if supabase does
    if (error) {
        throw new Error(error.message)
    }

    return { success: true }
}