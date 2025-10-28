'use client'

import { useGlobalPresence } from '@/features/organizations/members/queries/useGlobalPresence'
import { useCurrentUser } from '@/features/organizations/members/queries/useCurrentUser'

/**
 * Provider component that initializes global presence tracking
 * Must be used in a client component context
 */
export function PresenceProvider() {
  const { user } = useCurrentUser()

  // Initialize global presence tracking for the current user
  useGlobalPresence(user?.id || null)

  return null // This component only handles side effects
}
