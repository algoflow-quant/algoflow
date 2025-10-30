'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getNotifications } from '../actions/getNotifications'

// Hook to get all notifications for a user with realtime updates
// Subscribes to the user-specific broadcast channel for instant notification updates
export function useNotifications(userId: string) {
    const queryClient = useQueryClient()

    // Memoize the Supabase client so we don't create new WebSocket connections on every render
    // This improves performance and prevents connection leaks
    const supabase = useMemo(() => createClient(), [])

    // Initial fetch of notifications via server action
    const query = useQuery({
        queryKey: ['notifications', userId],
        queryFn: () => getNotifications(userId),
        staleTime: 1000 * 30, // Keep data fresh for 30 seconds before allowing refetch
    })

    // Subscribe to realtime updates for this specific user
    // Database triggers broadcast to user-specific channels when notifications change
    useEffect(() => {
        // Create a channel unique to this user
        // Format: user-{uuid} so only this user receives their notification updates
        const channel = supabase
        .channel(`user-${userId}`)
        .on(
            'broadcast',
            { event: 'notifications-change' }, // Listen for notification changes
            (payload: any) => {
            console.log('[useNotifications] Broadcast received:', payload)
            console.log('  Invalidating notifications query')

            // Tell React Query to refetch notifications
            // This ensures the UI always shows the latest data
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[useNotifications] Subscribed to channel: user-${userId}`)
            }
        })

        // Cleanup: unsubscribe when component unmounts or userId changes
        return () => {
        supabase.removeChannel(channel)
        }
    }, [userId, queryClient, supabase])

    return query
}