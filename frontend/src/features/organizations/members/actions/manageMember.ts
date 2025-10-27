'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import arcjet, { slidingWindow, detectBot } from '@arcjet/next'

// Arcjet configuration for member management protection
const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    rules: [
        detectBot({ mode: 'LIVE', allow: [] }),
        slidingWindow({ mode: 'LIVE', interval: '1m', max: 20 }) // 20 member actions per minute
    ]
})

export async function removeMember(organizationId: string, userId: string) {
    // Arcjet protection
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error('Too many member management actions. Please try again later.')
        }
        throw new Error('Request blocked')
    }

    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
        throw new Error('You must be logged in to remove members')
    }

    // Check current user's role
    const { data: currentMember } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', currentUser.id)
        .single()

    if (!currentMember || !['owner', 'moderator'].includes(currentMember.role)) {
        throw new Error('You do not have permission to remove members')
    }

    // Check target member's role
    const { data: targetMember } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .single()

    if (!targetMember) {
        throw new Error('Member not found')
    }

    // Can't remove owner
    if (targetMember.role === 'owner') {
        throw new Error('Cannot remove organization owner')
    }

    // Delete the member
    const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', userId)

    if (error) {
        throw new Error(error.message)
    }

    return { success: true }
}

export async function updateMemberRole(
    organizationId: string,
    userId: string,
    newRole: 'moderator' | 'member'
) {
    // Arcjet protection
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error('Too many member management actions. Please try again later.')
        }
        throw new Error('Request blocked')
    }

    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
        throw new Error('You must be logged in to update member roles')
    }

    // Check current user is owner
    const { data: currentMember } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', currentUser.id)
        .single()

    if (!currentMember || currentMember.role !== 'owner') {
        throw new Error('Only organization owners can change member roles')
    }

    // Check target member exists and is not owner
    const { data: targetMember } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .single()

    if (!targetMember) {
        throw new Error('Member not found')
    }

    if (targetMember.role === 'owner') {
        throw new Error('Cannot change owner role')
    }

    // Update the role
    const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)

    if (error) {
        throw new Error(error.message)
    }

    return { success: true }
}
