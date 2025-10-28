'use client'

// Tanstack imports
import { useQuery, useQueryClient } from '@tanstack/react-query'

// React imports
import { useEffect, useMemo } from 'react'

// server action imports
import { getOrganizations } from '../actions/getOrganizations'

// supabase imports
import { createClient } from '@/lib/supabase/client'


/*
 *  Client side hook. Called from client to subscribe to realtime organization updates
 *  Only listens to changes for organizations the user is a member of
 */
export function useOrganizations() {

    // Tanstack query client (runs in browser)
    const queryClient = useQueryClient()

    // Supabase client (memoized to prevent recreating on every render)
    const supabase = useMemo(() => createClient(), [])

    // Tanstack query handles loading state and caching
    const query = useQuery({
        queryKey: ['organizations'],
        queryFn: getOrganizations
    })

    // Realtime subscription - only listen to membership changes (filtered at DB level)
    useEffect(() => {
        // Get current user ID for filtering
        const getUserId = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            return user?.id
        }

        getUserId().then(userId => {
            if (!userId) return

            // Single subscription to organization_members table
            // Filtered at database level for efficiency - only fires for this user
            // Catches when user joins/leaves orgs, which triggers refetch
            // Org detail changes (name, avatar) are picked up on next refetch
            const channel = supabase
                .channel('user-org-memberships')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'organization_members',
                    filter: `user_id=eq.${userId}`
                }, () => {
                    queryClient.invalidateQueries({ queryKey: ['organizations'] })
                })
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        })
    }, [queryClient, supabase])

    return query
}