"use server"

// Types
import type { Organization } from '../types'

// Supabase
import { createClient } from '@/server/supabase/server'


/*
 *  Get Organization server action. Runs initially to get a users organization on first load
 */
export async function getOrganizations(): Promise<Organization[]> {

    // Get supabase client and get user data
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Check user exists
    if (!user) {
        throw new Error('Not authenticated')
    }

    // 2. Query organizations for this user
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

    // 3. Handle errors
    if (error) {
        throw new Error(error.message)
    }

    // 4. Return organizations array
    return data || []
}