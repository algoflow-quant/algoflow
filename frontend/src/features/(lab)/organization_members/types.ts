// Export database table types

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: 'owner' | 'moderator' | 'member'
  invited_by: string | null
  joined_at: string
  created_at: string
  updated_at: string
  // Joined from profiles table
  profiles: {
    username: string
    full_name: string | null
    avatar_url: string | null
    email: string
    last_seen_at: string | null  // Now comes from profiles, not org_members
  }
}

export interface MemberHistory {
  id: string
  organization_id: string
  user_id: string
  old_role: string | null
  new_role: string
  changed_by: string
  action: 'added' | 'role_changed' | 'removed' | 'left' | 'ownership_transferred'
  created_at: string
}