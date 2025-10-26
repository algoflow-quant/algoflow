'use client'

// Tanstack imports
import { useQuery, useQueryClient } from '@tanstack/react-query'

// React imports
import { useEffect, useMemo } from 'react'

// server action imports
import { getOrganizations } from '../actions/getOrganizations'

// supabase imports
import { createClient } from '@/server/supabase/client'


/*
 *  Client side hook. called from client to subscribe to realtime organization updates
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

    // Realtime subscription from supabase
    useEffect(() => {
        const channel = supabase
        .channel('organizations-changes') // Subscription name
        .on('postgres_changes', { // Listen for database changes
            event: '*', // * mean list to ALL events
            schema: 'public', // Public schema
            table: 'organizations' // Organizations table
        }, () => {
            // When ANY change happens, invalidate the React Query cache ** IMPORTANT
            queryClient.invalidateQueries({ queryKey: ['organizations'] })
        })
        .subscribe() // Actually start listening

        return () => {
        supabase.removeChannel(channel)
        }
    }, [queryClient, supabase]) // Include supabase in dependencies

    return query
}