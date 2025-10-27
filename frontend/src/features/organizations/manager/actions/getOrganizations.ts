"use server"

// Types
import type { Organization } from '../types'

// Supabase
import { createClient } from '@/lib/supabase/server'


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

    // 2. Query organization_members to get all orgs user belongs to
    const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)

    // 3. Handle errors
    if (memberError) {
        throw new Error(memberError.message)
    }

    // If user is not a member of any orgs, return empty array
    if (!memberData || memberData.length === 0) {
        return []
    }

    // 4. Get the organizations for those IDs
    const orgIds = memberData.map(m => m.organization_id)

    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)
        .order('created_at', { ascending: false })

    // 5. Handle errors
    if (error) {
        throw new Error(error.message)
    }

    // 6. Return organizations array
    return data || []
}