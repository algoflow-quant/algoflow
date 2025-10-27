'use server'

// Next js imports
import { createClient } from '@/lib/supabase/server'

// type imports
import type { OrganizationMember } from '../types'

/*
* Get members server action
*/
export async function getMembers(organizationId: string): Promise<OrganizationMember[]> {

    // Create supabse client
    const supabase = await createClient()

    // query organization members from the organization
    const { data: membersData, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('role', { ascending: true }) // owner first, then moderator, then member
    .order('joined_at', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    if (!membersData || membersData.length === 0) {
        return []
    }

    // Manually fetch profiles for all user_ids
    const userIds = membersData.map(m => m.user_id)
    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, email, last_seen_at')
        .in('id', userIds)

    if (profilesError) {
        throw new Error(profilesError.message)
    }

    // Map profiles to members
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])

    const members = membersData.map(member => ({
        ...member,
        profiles: profilesMap.get(member.user_id)!
    }))

    return members as OrganizationMember[]
}
