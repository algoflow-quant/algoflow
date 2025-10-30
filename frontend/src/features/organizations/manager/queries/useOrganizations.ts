'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { getOrganizations } from '../actions/getOrganizations'
import { createClient } from '@/lib/supabase/client'

// Hook to get all organizations the user is a member of with realtime updates
// This is more complex than other hooks because we need to subscribe to MULTIPLE channels
// (one for each org the user belongs to) and dynamically update subscriptions
export function useOrganizations() {
    const queryClient = useQueryClient()

    // Memoize Supabase client to prevent recreating connections on every render
    // Critical here because we're managing multiple channel subscriptions
    const supabase = useMemo(() => createClient(), [])

    // Initial fetch of organizations via server action (goes through ABAC permission checks)
    const query = useQuery({
        queryKey: ['organizations'],
        queryFn: getOrganizations
    })

    // Subscribe to realtime updates for ALL orgs the user is a member of
    // This effect runs whenever query.data changes (new orgs added, old ones removed)
    useEffect(() => {
        const subscribeToOrgs = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            // Don't set up subscriptions if user isn't logged in or orgs haven't loaded yet
            if (!user?.id || !query.data) return

            // We'll track all channel subscriptions so we can clean them up later
            const channels: any[] = []

            // Create a subscription for each org the user belongs to
            // This way if you're in 5 orgs, you'll have 5 active subscriptions
            query.data.forEach((org: any) => {
                const channel = supabase
                    .channel(`org-${org.id}`) // Each org gets its own channel

                    // Listen for membership changes in this org
                    // Example: someone joins or leaves this specific org
                    .on('broadcast', { event: 'members-change' }, (payload: any) => {
                        console.log('[useOrganizations] Broadcast received:', payload)
                        console.log('  Invalidating organizations query')

                        // Refetch the entire org list because membership might have changed
                        // (user could have been added to a new org or removed from one)
                        queryClient.invalidateQueries({ queryKey: ['organizations'] })
                    })

                    // Listen for org detail changes (name, avatar, settings, etc)
                    .on('broadcast', { event: 'org-change' }, (payload: any) => {
                        console.log('[useOrganizations] Broadcast received:', payload)
                        console.log('  Invalidating organizations query')
                        queryClient.invalidateQueries({ queryKey: ['organizations'] })
                    })
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            console.log(`[useOrganizations] Subscribed to channel: org-${org.id}`)
                        }
                    })

                channels.push(channel)
            })

            // Cleanup function: unsubscribe from ALL channels
            // This prevents memory leaks and ensures we're not listening to orgs we left
            return () => {
                channels.forEach(channel => supabase.removeChannel(channel))
            }
        }

        subscribeToOrgs()
    }, [query.data, queryClient, supabase]) // re-run effect if org list, supabase client, or queryClient changes

    return query
}