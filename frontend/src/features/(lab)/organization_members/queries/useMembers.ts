'use client'

// Tanstack import
import { useQuery, useQueryClient } from '@tanstack/react-query'

// react import
import { useEffect, useMemo } from 'react'

// supabase import
import { createClient } from '@/server/supabase/client'

// Server action
import { getMembers } from '../actions/getMembers'

export function useMembers(organizationId: string) {
  const queryClient = useQueryClient() // tanstack client
  const supabase = useMemo(() => createClient(), []) // supabase client (memoized)

  // Initial fetch
  const query = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: () => getMembers(organizationId),
    staleTime: 1000 * 60, // Consider data fresh for 1 minute (initial fetch is isr)
  })

  // Realtime subscription for member changes
  useEffect(() => {
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
        (payload) => {
          console.log('Member change:', payload)
          
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
  }, [organizationId, queryClient, supabase]) //dependecny array

  return query
}