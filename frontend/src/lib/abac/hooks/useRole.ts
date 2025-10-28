'use client'

import { useEffect, useState } from 'react'
import type { GlobalRole, OrganizationRole } from '../types'

/**
 * Role data returned from server
 * Supports multi-level hierarchy: global → org → team (future)
 */
interface RoleData {
  globalRole: GlobalRole | null
  organizationId?: string
  organizationRole?: OrganizationRole
  // Future: teamId, teamRole when teams are added
  loading: boolean
}

/**
 * Universal role hook - fetches user's role at all levels
 * Call once per component tree and use derived hooks for specific checks
 */
export function useRole(organizationId?: string): RoleData {
  const [roleData, setRoleData] = useState<RoleData>({
    globalRole: null,
    loading: true,
  })

  useEffect(() => {
    async function fetchRole() {
      try {
        const params = organizationId ? `?organizationId=${organizationId}` : ''
        const response = await fetch(`/api/user-role${params}`)

        if (!response.ok) {
          throw new Error('Failed to fetch role')
        }

        const data = await response.json()
        setRoleData({
          globalRole: data.globalRole,
          organizationId: data.organizationId,
          organizationRole: data.organizationRole,
          loading: false,
        })
      } catch (error) {
        console.error('[useRole] Failed to fetch role:', error)
        setRoleData({
          globalRole: null,
          loading: false,
        })
      }
    }

    fetchRole()
  }, [organizationId])

  return roleData
}

// ================================ GLOBAL ROLE HOOKS ================================

/**
 * Check if user is a global admin
 * Usage: const { isAdmin, loading } = useIsAdmin()
 */
export function useIsAdmin() {
  const { globalRole, loading } = useRole()

  return {
    isAdmin: globalRole === 'admin',
    loading,
  }
}

/**
 * Check if user is a standard (non-admin) user
 * Usage: const { isStandard, loading } = useIsStandard()
 */
export function useIsStandard() {
  const { globalRole, loading } = useRole()

  return {
    isStandard: globalRole === 'standard',
    loading,
  }
}

/**
 * Get user's global role with type narrowing
 * Usage: const { role, isAdmin, isStandard, loading } = useGlobalRole()
 */
export function useGlobalRole() {
  const { globalRole, loading } = useRole()

  return {
    role: globalRole,
    isAdmin: globalRole === 'admin',
    isStandard: globalRole === 'standard',
    loading,
  }
}

// ============================== ORGANIZATION ROLE HOOKS ==============================

/**
 * Check if user is an organization owner
 * Usage: const { isOwner, loading } = useIsOwner(orgId)
 */
export function useIsOwner(organizationId: string) {
  const { organizationRole, loading } = useRole(organizationId)

  return {
    isOwner: organizationRole === 'owner',
    loading,
  }
}

/**
 * Check if user is an organization moderator
 * Usage: const { isModerator, loading } = useIsModerator(orgId)
 */
export function useIsModerator(organizationId: string) {
  const { organizationRole, loading } = useRole(organizationId)

  return {
    isModerator: organizationRole === 'moderator',
    loading,
  }
}

/**
 * Check if user is an organization member (any role)
 * Usage: const { isMember, loading } = useIsMember(orgId)
 */
export function useIsMember(organizationId: string) {
  const { organizationRole, loading } = useRole(organizationId)

  return {
    isMember: organizationRole !== undefined,
    loading,
  }
}

/**
 * Get user's organization role with type narrowing
 * Usage: const { role, isOwner, isModerator, isMember, loading } = useOrgRole(orgId)
 */
export function useOrgRole(organizationId: string) {
  const { organizationRole, loading } = useRole(organizationId)

  return {
    role: organizationRole,
    isOwner: organizationRole === 'owner',
    isModerator: organizationRole === 'moderator',
    isMember: organizationRole === 'member',
    hasRole: organizationRole !== undefined,
    loading,
  }
}

// ============================== PERMISSION HELPER HOOKS ==============================

/**
 * Check if user can manage org members (owner, moderator, or admin)
 * Usage: const { canManageMembers, loading } = useCanManageMembers(orgId)
 */
export function useCanManageMembers(organizationId: string) {
  const { globalRole, organizationRole, loading } = useRole(organizationId)

  const canManage =
    globalRole === 'admin' ||
    organizationRole === 'owner' ||
    organizationRole === 'moderator'

  return {
    canManageMembers: canManage,
    loading,
  }
}

/**
 * Check if user can see billing info (owner or admin)
 * Usage: const { canSeeBilling, loading } = useCanSeeBilling(orgId)
 */
export function useCanSeeBilling(organizationId: string) {
  const { globalRole, organizationRole, loading } = useRole(organizationId)

  const canSee =
    globalRole === 'admin' ||
    organizationRole === 'owner'

  return {
    canSeeBilling: canSee,
    loading,
  }
}

/**
 * Check if user can update organization settings (owner or admin)
 * Usage: const { canUpdateOrg, loading } = useCanUpdateOrg(orgId)
 */
export function useCanUpdateOrg(organizationId: string) {
  const { globalRole, organizationRole, loading } = useRole(organizationId)

  const canUpdate =
    globalRole === 'admin' ||
    organizationRole === 'owner'

  return {
    canUpdateOrg: canUpdate,
    loading,
  }
}

/**
 * Check if user can delete organization (owner or admin)
 * Usage: const { canDeleteOrg, loading } = useCanDeleteOrg(orgId)
 */
export function useCanDeleteOrg(organizationId: string) {
  const { globalRole, organizationRole, loading } = useRole(organizationId)

  const canDelete =
    globalRole === 'admin' ||
    organizationRole === 'owner'

  return {
    canDeleteOrg: canDelete,
    loading,
  }
}

// ============================== COMBINED ROLE HOOKS ==============================

/**
 * Check if user has admin privileges (global admin OR org owner)
 * Useful for UI that should be visible to "any admin"
 * Usage: const { hasAdminPrivileges, loading } = useHasAdminPrivileges(orgId)
 */
export function useHasAdminPrivileges(organizationId?: string) {
  const { globalRole, organizationRole, loading } = useRole(organizationId)

  const hasPrivileges =
    globalRole === 'admin' ||
    organizationRole === 'owner'

  return {
    hasAdminPrivileges: hasPrivileges,
    loading,
  }
}

/**
 * Get all role data at once (global + org)
 * Usage: const { globalRole, orgRole, isAdmin, isOwner, loading } = useAllRoles(orgId)
 */
export function useAllRoles(organizationId?: string) {
  const roleData = useRole(organizationId)

  return {
    globalRole: roleData.globalRole,
    orgRole: roleData.organizationRole,
    isAdmin: roleData.globalRole === 'admin',
    isStandard: roleData.globalRole === 'standard',
    isOwner: roleData.organizationRole === 'owner',
    isModerator: roleData.organizationRole === 'moderator',
    isMember: roleData.organizationRole === 'member',
    loading: roleData.loading,
  }
}
