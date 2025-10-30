'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMembers } from '../actions/getMembers'
import { checkMembership } from '../actions/checkMembership'
import { useCurrentUser } from './useCurrentUser'

// Hook to get all members of an organization with realtime updates
// Subscribes to the org-specific broadcast channel for instant updates
export function useMembers(organizationId: string) {
  const queryClient = useQueryClient()

  // useMemo prevents creating a new Supabase client on every render
  // This is important because each client would create new WebSocket connections
  // Empty dependency array [] means "only create this once and reuse it"
  const supabase = useMemo(() => createClient(), [])
  const { user } = useCurrentUser()

  // Initial fetch of members via server action (goes through ABAC permission checks)
  const query = useQuery({
    queryKey: ['organization-members', organizationId], // unique key per org
    queryFn: () => getMembers(organizationId), // fetch members for this org
    staleTime: 1000 * 60, // Consider data fresh for 1 minute before refetching
  })

  // Subscribe to realtime updates for this specific org
  // Database triggers send broadcasts when members are added/removed/updated
  // We listen for these broadcasts and refetch the data when they arrive
  useEffect(() => {
    // Don't set up subscription if user isn't logged in
    if (!user) return

    // Create a channel specific to this organization
    // Format: org-{uuid} so only members of this org receive updates
    const channel = supabase
      .channel(`org-${organizationId}`)
      .on(
        'broadcast',
        { event: 'members-change' }, // Listen specifically for member changes
        async (payload: any) => {
          console.log('[useMembers] Broadcast received:', payload)

          // Special handling for DELETE operations: check if WE got removed
          // If we're no longer a member, redirect to dashboard
          if (payload.payload?.operation === 'DELETE') {
            try {
              const isMember = await checkMembership(organizationId)
              if (!isMember) {
                console.log('  User was removed from org, redirecting to dashboard')
                window.location.href = '/dashboard' // redirect to dashboard
                return
              }
            } catch (error) {
              console.error('  Failed to check membership:', error)
            }
          }

          // Tell React Query to refetch the members list
          // This triggers getMembers() which goes through ABAC permission checks
          console.log('  Invalidating members query')
          queryClient.invalidateQueries({
            queryKey: ['organization-members', organizationId],
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[useMembers] Subscribed to channel: org-${organizationId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useMembers] Channel subscription failed')
        }
      })

    // Cleanup function: runs when component unmounts or dependencies change
    // Unsubscribe from the channel to prevent memory leaks
    return () => {
      supabase.removeChannel(channel) // unsubscribe from channel
    }
  }, [organizationId, queryClient, supabase, user]) // re-run effect if orgId, user, or supabase client changes

  return query
}