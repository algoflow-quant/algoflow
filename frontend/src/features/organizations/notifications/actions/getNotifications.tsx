'use server'

// supabase import
import { createClient } from '@/lib/supabase/server'

// import types
import type { Notification } from '../types'

export async function getNotifications(userId: string): Promise<Notification[]> {
    const supabase = await createClient() // create supabase client

    const { data, error } = await supabase // fetch notifications
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

    // throw error if sb returns
    if (error) {
        throw new Error(error.message)
    }

    // return notifcation array
    return data as Notification[]
}