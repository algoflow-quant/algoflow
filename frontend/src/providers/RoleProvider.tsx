'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { GlobalRole, OrganizationRole } from '@/lib/abac/types'

/**
 * Role context value
 * Passed from server component (via props) to all client components
 */
interface RoleContextValue {
  globalRole: GlobalRole
  organizationRole?: OrganizationRole
  organizationId?: string
}

const RoleContext = createContext<RoleContextValue | null>(null)

/**
 * Role Provider - wraps client components with role data
 * Role data is fetched on server and passed down via props
 *
 * Usage in server component or layout:
 * const userContext = await buildUserContextWithOrg(orgId)
 * return <RoleProvider value={{ globalRole: userContext.globalRole, organizationRole: userContext.organizationRole }}>{children}</RoleProvider>
 */
export function RoleProvider({
  children,
  value
}: {
  children: ReactNode
  value: RoleContextValue
}) {
  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  )
}

/**
 * Get full role data
 * Usage: const { globalRole, organizationRole } = useUserRole()
 */
export function useUserRole(): RoleContextValue {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useUserRole must be used within RoleProvider')
  }
  return context
}

// ================================ GLOBAL ROLE HOOKS ================================

/**
 * Check if user is a global admin
 * Usage: const isAdmin = useIsAdmin()
 */
export function useIsAdmin(): boolean {
  const { globalRole } = useUserRole()
  return globalRole === 'admin'
}

/**
 * Check if user is a standard (non-admin) user
 * Usage: const isStandard = useIsStandard()
 */
export function useIsStandard(): boolean {
  const { globalRole } = useUserRole()
  return globalRole === 'standard'
}

/**
 * Get user's global role with helpers
 * Usage: const { globalRole, isAdmin, isStandard } = useGlobalRole()
 */
export function useGlobalRole() {
  const { globalRole } = useUserRole()
  return {
    globalRole,
    isAdmin: globalRole === 'admin',
    isStandard: globalRole === 'standard',
  }
}

// ============================== ORGANIZATION ROLE HOOKS ==============================

/**
 * Check if user is an organization owner
 * Usage: const isOwner = useIsOwner()
 */
export function useIsOwner(): boolean {
  const { organizationRole } = useUserRole()
  return organizationRole === 'owner'
}

/**
 * Check if user is an organization moderator
 * Usage: const isModerator = useIsModerator()
 */
export function useIsModerator(): boolean {
  const { organizationRole } = useUserRole()
  return organizationRole === 'moderator'
}

/**
 * Check if user is an organization member (any role)
 * Usage: const isMember = useIsMember()
 */
export function useIsMember(): boolean {
  const { organizationRole } = useUserRole()
  return organizationRole !== undefined
}

/**
 * Get user's organization role with helpers
 * Usage: const { organizationRole, isOwner, isModerator, isMember } = useOrgRole()
 */
export function useOrgRole() {
  const { organizationRole } = useUserRole()
  return {
    organizationRole,
    isOwner: organizationRole === 'owner',
    isModerator: organizationRole === 'moderator',
    isMember: organizationRole === 'member',
    hasRole: organizationRole !== undefined,
  }
}

// ============================== PERMISSION HELPER HOOKS ==============================

/**
 * Check if user can manage org members (owner, moderator, or admin)
 * Usage: const canManageMembers = useCanManageMembers()
 */
export function useCanManageMembers(): boolean {
  const { globalRole, organizationRole } = useUserRole()

  return (
    globalRole === 'admin' ||
    organizationRole === 'owner' ||
    organizationRole === 'moderator'
  )
}

/**
 * Check if user can see billing info (owner or admin)
 * Usage: const canSeeBilling = useCanSeeBilling()
 */
export function useCanSeeBilling(): boolean {
  const { globalRole, organizationRole } = useUserRole()

  return (
    globalRole === 'admin' ||
    organizationRole === 'owner'
  )
}

/**
 * Check if user can update organization settings (owner or admin)
 * Usage: const canUpdateOrg = useCanUpdateOrg()
 */
export function useCanUpdateOrg(): boolean {
  const { globalRole, organizationRole } = useUserRole()

  return (
    globalRole === 'admin' ||
    organizationRole === 'owner'
  )
}

/**
 * Check if user can delete organization (owner or admin)
 * Usage: const canDeleteOrg = useCanDeleteOrg()
 */
export function useCanDeleteOrg(): boolean {
  const { globalRole, organizationRole } = useUserRole()

  return (
    globalRole === 'admin' ||
    organizationRole === 'owner'
  )
}

/**
 * Check if user can invite members (owner, moderator, or admin)
 * Usage: const canInvite = useCanInviteMembers()
 */
export function useCanInviteMembers(): boolean {
  const { globalRole, organizationRole } = useUserRole()

  return (
    globalRole === 'admin' ||
    organizationRole === 'owner' ||
    organizationRole === 'moderator'
  )
}

/**
 * Get organization ID from context
 * Usage: const orgId = useOrgId()
 */
export function useOrgId(): string | undefined {
  const { organizationId } = useUserRole()
  return organizationId
}

// ============================== COMBINED HOOKS ==============================

/**
 * Check if user has admin privileges (global admin OR org owner)
 * Usage: const hasAdminPrivileges = useHasAdminPrivileges()
 */
export function useHasAdminPrivileges(): boolean {
  const { globalRole, organizationRole } = useUserRole()

  return (
    globalRole === 'admin' ||
    organizationRole === 'owner'
  )
}
