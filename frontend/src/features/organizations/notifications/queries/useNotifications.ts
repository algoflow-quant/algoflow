'use client'

// import query hook and query client (tanstack)
import { useQuery, useQueryClient } from '@tanstack/react-query'

//import useffect and useMemo from react
import { useEffect, useMemo } from 'react'

// import supabase client
import { createClient } from '@/lib/supabase/client'

// import get notifications server action with realtime
import { getNotifications } from '../actions/getNotifications'

export function useNotifications(userId: string) {
    const queryClient = useQueryClient() // Create a tanstack query client
    const supabase = useMemo(() => createClient(), []) // memoize the supabase in realtime calls to avoid creating a bunch of clients

    // Query the notficaitons on the server intitally with ISR 
    const query = useQuery({
        queryKey: ['notifications', userId],
        queryFn: () => getNotifications(userId),
        staleTime: 1000 * 30, // 30 seconds
    })

    // Realtime subscription to fetch live changes
    useEffect(() => {
        const channel = supabase
        .channel(`notifications-${userId}`)
        .on(
            'postgres_changes',
            {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
            },
            (payload) => {
            console.log('Notification change:', payload)
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
            }
        )
        .subscribe()

        return () => {
        supabase.removeChannel(channel)
        }
    }, [userId, queryClient, supabase]) // Cleanup dependecy array

    return query
}