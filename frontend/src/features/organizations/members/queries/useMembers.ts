'use client'

// Tanstack import
import { useQuery, useQueryClient } from '@tanstack/react-query'

// react import
import { useEffect, useMemo } from 'react'

// supabase import
import { createClient } from '@/lib/supabase/client'

// Server action
import { getMembers } from '../actions/getMembers'

// Current user
import { useCurrentUser } from './useCurrentUser'

export function useMembers(organizationId: string) {
  const queryClient = useQueryClient() // tanstack client
  const supabase = useMemo(() => createClient(), []) // supabase client (memoized)
  const { user } = useCurrentUser()

  // Initial fetch
  const query = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: () => getMembers(organizationId),
    staleTime: 1000 * 60, // Consider data fresh for 1 minute (initial fetch is isr)
  })

  // Realtime subscription for member changes
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`org-members-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'organization_members',
          filter: `organization_id=eq.${organizationId}`,
        },
        async (payload) => {
          // Check if current user was deleted - need to verify by checking current membership
          if (payload.eventType === 'DELETE' && user) {
            // Query to check if current user still exists in this organization
            const { data: membership } = await supabase
              .from('organization_members')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('user_id', user.id)
              .maybeSingle()

            // If no membership found, user was removed - redirect
            if (!membership) {
              window.location.href = '/lab'
              return // Don't invalidate queries since we're redirecting
            }
          }

          // Invalidate and refetch when any member changes (causes server ISR)
          queryClient.invalidateQueries({
            queryKey: ['organization-members', organizationId],
          })
        }
      )
      .subscribe() // subsribe to channel

    return () => {
      supabase.removeChannel(channel) // remove channel after component unmount
    }
  }, [organizationId, queryClient, supabase, user]) //dependecny array

  return query
}