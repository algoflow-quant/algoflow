/**
 * ABAC (Attribute-Based Access Control) Types
 * Two-level permissions: global (admin/standard) + org-specific (owner/moderator/member)
 */

// ======================================= USER ATTRIBUTES ===============================================

export type GlobalRole = 'admin' | 'standard'

export type OrganizationRole = 'owner' | 'moderator' | 'member'

// Built fresh each request - captures user's permissions at that moment
export interface UserContext {
    id: string
    globalRole: GlobalRole
    organizationId?: string // Only set when action is within an org
    organizationRole?: OrganizationRole // Their role in that specific org
}

// ==================================== RESOURCE ATTRIBUTES ==============================================

export type ResourceType =
    | 'profile'                  // Profile - ABAC handles field-level access
    | 'organization'             // Organization - ABAC handles field-level access
    | 'organization_member'
    | 'invitation'
    | 'notification'
    | 'project'

export type Action =
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'list'
    | 'invite'
    | 'manage'
    | 'transfer_ownership'

// Resource-specific attributes using discriminated unions
// Each resource type has its own specific fields

interface ProfileResource {
    type: 'profile'
    id?: string
    ownerId: string
    fieldsBeingRead?: string[] // For read checks on private fields
    fieldsBeingModified?: string[] // For update checks
}

interface OrganizationResource {
    type: 'organization'
    id?: string // The organization ID
    plan?: string // For creation - what plan user wants (checked during create)
    existingFreeOrgCount?: number // For creation - how many free orgs user has
    fieldsBeingRead?: string[] // For read - which sensitive fields are being accessed
    fieldsBeingModified?: string[] // For update - which fields are being changed
}

interface OrganizationMemberResource {
    type: 'organization_member'
    id?: string
    organizationId: string
    targetUserId?: string
    targetRole?: OrganizationRole
    newRole?: OrganizationRole // For role changes
}

interface InvitationResource {
    type: 'invitation'
    id?: string
    organizationId?: string
    targetUserId?: string
}

interface NotificationResource {
    type: 'notification'
    id?: string
    ownerId: string
}

interface ProjectResource {
    type: 'project'
    id?: string
    organizationId?: string
    isProjectMember?: boolean
}

// Union of all resource types - TypeScript will enforce correct fields per type
export type ResourceAttributes =
    | ProfileResource
    | OrganizationResource
    | OrganizationMemberResource
    | InvitationResource
    | NotificationResource
    | ProjectResource

// ==================================== AUTHORIZATION ====================================================

// Combines user + action + resource for permission check
export interface AuthorizationRequest {
    user: UserContext
    action: Action
    resource: ResourceAttributes
}

export interface AuthorizationResult {
    granted: boolean
    reason?: string
}

// ==================================== POLICY RULES =====================================================

// Function that returns true/false - "is this allowed?"
export type PermissionRule = (request: AuthorizationRequest) => boolean

export interface PermissionPolicy {
    resource: ResourceType
    action: Action
    rule: PermissionRule
    description: string
}