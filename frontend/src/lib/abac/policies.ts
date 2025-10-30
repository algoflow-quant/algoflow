import type {
  PermissionPolicy,
  AuthorizationRequest,
} from './types'

/**
 * Permission Policies
 * 
 * Each policy defines WHO can perform WHAT action on WHICH resource. returns true or false
 */

// ===================================== PROFILE POLICIES (Public Data) =============================

const profilePolicies: PermissionPolicy[] = [
    {
        resource: 'profile',
        action: 'read',
        description: 'Anyone can read public profile fields, private fields need ownership/admin',
        rule: (req) => {
            if (req.resource.type !== 'profile') return false

            const isAdmin = req.user.globalRole === 'admin'
            const isOwner = req.user.id === req.resource.ownerId 

            // Private fields that require ownership or admin
            const privateFields = ['email', 'role', 'last_seen_at']
            const fieldsBeingRead = req.resource.fieldsBeingRead || []
            const readingPrivate = fieldsBeingRead.some((f: string) => privateFields.includes(f))

            // If reading private fields, must be owner or admin
            if (readingPrivate) {
                return isOwner || isAdmin
            }

            // Public fields (username, full_name, avatar_url, bio) - anyone can read
            return true
        },
    },
    {
        resource: 'profile',
        action: 'update',
        description: 'Users can update own profile, admins can update everything',
        rule: (req) => {
            if (req.resource.type !== 'profile') return false

            const isAdmin = req.user.globalRole === 'admin'
            const isOwner = req.user.id === req.resource.ownerId

            // Admin can update everything
            if (isAdmin) return true

            // Protected fields that owner cannot change
            const protectedFields = [
                'id',           // Primary key - immutable
                'role',         // Role assignment - admin only
                'created_at',   // Timestamp - database managed
                'updated_at',   // Timestamp - database managed
            ]

            const fieldsBeingModified = req.resource.fieldsBeingModified || []
            const modifyingProtected = fieldsBeingModified.some((f: string) => protectedFields.includes(f))

            if (modifyingProtected) return false

            // Owner can update all other fields
            return isOwner
        },
    },
    {
        resource: 'profile',
        action: 'delete',
        description: 'Users can delete own profile, admins can delete any',
        rule: (req) => {
            if (req.resource.type !== 'profile') return false
            return req.user.id === req.resource.ownerId ||
                req.user.globalRole === 'admin'
        },
    },
]

// ========================================== ORGANIZATION POLICIES =========================================

// OrganizationPolicies is another array of permission polices
const organizationPolicies: PermissionPolicy[] = [
    {
        resource: 'organization',
        action: 'create',
        description: 'Can create org (limit 1 free org per user, unlimited paid)',
        rule: (req) => {
            // Admins can create unlimited orgs
            if (req.user.globalRole === 'admin') return true

            if (req.resource.type !== 'organization') return false

            // Check plan being created (passed from DAL)
            if (req.resource.plan === 'free') {
                // Limit 1 free org per user
                return (req.resource.existingFreeOrgCount ?? 0) === 0 // nullish coalescing operator to default to 0 if null or undefined
            }

            // Paid orgs - no limit
            return true
        },
    },
    {
        resource: 'organization',
        action: 'read',
        description: 'Members can read public fields, owner/admin can read all fields',
        rule: (req) => {
            if (req.resource.type !== 'organization') return false

            // Check if user is member of this org
            const isMember = req.user.organizationId === req.resource.id
            const isAdmin = req.user.globalRole === 'admin'
            const isOwner = req.user.organizationRole === 'owner'

            if (!isMember && !isAdmin) return false // Not a member at all

            // Sensitive fields that only owner/admin can read
            const sensitiveFields = ['plan', 'credits_limit', 'credits_balance', 'settings']
            const fieldsBeingRead = req.resource.fieldsBeingRead || []

            // Check if trying to read sensitive fields
            const readingSensitiveData = fieldsBeingRead.some(f => sensitiveFields.includes(f))

            if (readingSensitiveData) {
                // Only owner or admin can read sensitive fields
                return isOwner || isAdmin
            }

            // Public fields (name, avatar_url, description, type) - all members can read
            return true
        },
    },
    {
        resource: 'organization',
        action: 'update',
        description: 'Owner can update public fields, only admin can update billing/ownership',
        rule: (req) => {
            if (req.resource.type !== 'organization') return false

            const isAdmin = req.user.globalRole === 'admin'
            const isOwner = req.user.organizationRole === 'owner'

            // Admin can update everything
            if (isAdmin) return true

            // Fields that NO ONE except admin can change
            const protectedFields = [
                'id',                    // Primary key - immutable
                'owner_id',              // Ownership transfer requires special flow
                'plan',                  // Billing - admin only
                'credits_limit',         // Billing - admin only
                'credits_balance',       // Billing - admin only
                'created_at',            // Timestamp - database managed
                'updated_at',            // Timestamp - database managed
            ]

            const fieldsBeingModified = req.resource.fieldsBeingModified || []
            const modifyingProtected = fieldsBeingModified.some((f: string) => protectedFields.includes(f))

            // Owner cannot modify protected fields
            if (modifyingProtected) return false

            // Owner can update public fields (name, avatar_url, description, type, settings)
            return isOwner
        },
    },
    {
        resource: 'organization',
        action: 'delete',
        description: 'Only owner can delete their organization (or admin)',
        rule: (req) =>
            req.user.organizationRole === 'owner' ||
            req.user.globalRole === 'admin',
    },
    {
        resource: 'organization',
        action: 'list',
        description: 'Users can list organizations they belong to',
        rule: () => true, // Filtered in query by user's memberships
    },
]

// No separate organization_settings table - field-level access controlled in organization policies above

// ====================================== ORGANIZATION MEMBER POLICIES ======================================

const organizationMemberPolicies: PermissionPolicy[] = [
    {
        resource: 'organization_member',
        action: 'read',
        description: 'Members can view other members in their org',
        rule: (req) => {
            if (req.resource.type !== 'organization_member') return false
            return req.user.organizationId === req.resource.organizationId ||
                req.user.globalRole === 'admin'
        },
    },
    {
        resource: 'organization_member',
        action: 'list',
        description: 'Members can list all members in their org',
        rule: (req) => {
            if (req.resource.type !== 'organization_member') return false
            return req.user.organizationId === req.resource.organizationId ||
                req.user.globalRole === 'admin'
        },
    },
    {
        resource: 'organization_member',
        action: 'create',
        description: 'Owners and moderators can add members (invite)',
        rule: (req) => {
            if (req.resource.type !== 'organization_member') return false

            // Admin can always add members
            if (req.user.globalRole === 'admin') return true

            // Must be in the same org
            if (req.user.organizationId !== req.resource.organizationId) return false

            // Must be owner or moderator
            return ['owner', 'moderator'].includes(req.user.organizationRole || '')
        },
    },
    {
        resource: 'organization_member',
        action: 'update',
        description: 'Owners can change member roles (moderator cannot promote to owner)',
        rule: (req) => {
            if (req.resource.type !== 'organization_member') return false

            // Admin can always update
            if (req.user.globalRole === 'admin') return true

            // Must be in the same org
            if (req.user.organizationId !== req.resource.organizationId) return false

            // Only owner can change roles
            if (req.user.organizationRole !== 'owner') return false

            // Cannot change someone to owner (use transfer_ownership for that)
            if (req.resource.newRole === 'owner') return false

            return true
        },
    },
    {
        resource: 'organization_member',
        action: 'delete',
        description: 'Owners/moderators can remove members (not owners). Members can leave.',
        rule: (req) => {
            if (req.resource.type !== 'organization_member') return false

            // Admin can always remove
            if (req.user.globalRole === 'admin') return true

            // Members can remove themselves (leave org)
            if (req.user.id === req.resource.targetUserId) return true

            // Must be in the same org to remove others
            if (req.user.organizationId !== req.resource.organizationId) return false

            // Must be owner or moderator to remove others
            if (!['owner', 'moderator'].includes(req.user.organizationRole || '')) return false

            // Cannot remove owner (owner must transfer or delete org)
            if (req.resource.targetRole === 'owner') return false

            return true
        },
    },
    {
        resource: 'organization_member',
        action: 'transfer_ownership',
        description: 'Only owner can transfer ownership to another member',
        rule: (req) =>
            req.user.organizationRole === 'owner' ||
            req.user.globalRole === 'admin',
    },
]

// ========================================== INVITATION POLICIES ===========================================

const invitationPolicies: PermissionPolicy[] = [
    {
        resource: 'invitation',
        action: 'create',
        description: 'Owners and moderators can send invites',
        rule: (req) =>
            ['owner', 'moderator'].includes(req.user.organizationRole || '') ||
            req.user.globalRole === 'admin', // admin owner or moderator
    },
    {
        resource: 'invitation',
        action: 'read',
        description: 'Recipients and org managers can view invites',
        rule: (req) => {
            if (req.resource.type !== 'invitation') return false
            return req.user.id === req.resource.targetUserId ||
                req.user.organizationRole === 'owner' ||
                req.user.organizationRole === 'moderator' ||
                req.user.globalRole === 'admin'
        }, // admin, owner, moderator, or if your id matches
    },
    {
        resource: 'invitation',
        action: 'update',
        description: 'Recipients can accept/decline invitations',
        rule: (req) => {
            if (req.resource.type !== 'invitation') return false
            // Only the invited user can accept/decline
            return req.user.id === req.resource.targetUserId ||
                req.user.globalRole === 'admin'
        },
    },
    {
        resource: 'invitation',
        action: 'delete',
        description: 'Managers can cancel, recipients can decline',
        rule: (req) => {
            if (req.resource.type !== 'invitation') return false
            return req.user.id === req.resource.targetUserId ||
                ['owner', 'moderator'].includes(req.user.organizationRole || '') ||
                req.user.globalRole === 'admin'
                // onwer or moderators can cancel invites as well as the person who got it
        },
    },
]

// ======================================== NOTIFICATION POLICIES ===========================================

const notificationPolicies: PermissionPolicy[] = [
    {
        resource: 'notification',
        action: 'create',
        description: 'System can create notifications for any user (internal use)',
        rule: (req) => {
            if (req.resource.type !== 'notification') return false
            // Allow any authenticated user to trigger notification creation
            // ABAC will ensure notifications are only created for valid scenarios
            return true
        },
    },
    {
        resource: 'notification',
        action: 'read',
        description: 'Users can read own notifications',
        rule: (req) => {
            if (req.resource.type !== 'notification') return false
            return req.user.id === req.resource.ownerId ||
                req.user.globalRole === 'admin'
        }, // users or admins cad read notifications
    },
    {
        resource: 'notification',
        action: 'update',
        description: 'Users can mark own notifications as read',
        rule: (req) => {
            if (req.resource.type !== 'notification') return false
            return req.user.id === req.resource.ownerId ||
                req.user.globalRole === 'admin'
        }, // usrs or admins can mark notifcations as read
    },
    {
        resource: 'notification',
        action: 'delete',
        description: 'Users can delete own notifications',
        rule: (req) => {
            if (req.resource.type !== 'notification') return false
            return req.user.id === req.resource.ownerId ||
                req.user.globalRole === 'admin'
        },
    },
]

// ========================================= EXPORT ALL POLICIES ============================================

// Export perms to all policies to make them easily acessible
export const allPolicies: PermissionPolicy[] = [
    ...profilePolicies,
    ...organizationPolicies,
    ...organizationMemberPolicies,
    ...invitationPolicies,
    ...notificationPolicies,
]