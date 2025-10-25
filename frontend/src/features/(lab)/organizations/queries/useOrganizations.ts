'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getOrganizations } from '../actions/getOrganizations'
import { createClient } from '@/server/supabase/client'


/*
 *  Client side hook. called from client to subscribe to realtime organization updates
 */
export function useOrganizations() {

    // Tanstack query client (runs in browser)
    const queryClient = useQueryClient()

    // Tanstack query handles loading state and caching
    const query = useQuery({
        queryKey: ['organizations'],
        queryFn: getOrganizations
    })

    // Realtime subscription from supabase
    useEffect(() => {
        const supabase = createClient() // 1. Create the client
        const channel = supabase
        .channel('organizations-changes') // Subscription name
        .on('postgres_changes', { // Listen for database changes
            event: '*', // * mean list to ALL events
            schema: 'public', // Public schema
            table: 'organizations' // Organizations table
        }, () => {
            // 4. When ANY change happens, invalidate the React Query cache ** IMPORTANT
            queryClient.invalidateQueries({ queryKey: ['organizations'] })
        })
        .subscribe() // 5. Actually start listening
        
        return () => {
        supabase.removeChannel(channel)
        }
    }, [queryClient]) // Dependency array never changes really. Created and destroyed when component mounts and unmounts in the DOM
    
    return query
}