import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { UserContext } from '@/lib/abac/types'

// Build UserContext from Supabase auth session
// Uses regular client for auth, service role for data (bypasses RLS - ABAC handles authorization)
export async function buildUserContext(): Promise<UserContext | null> {
  const authClient = await createClient()
  const supabase = createServiceRoleClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) return null

  // Get user's profile for role (single profiles table)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    globalRole: (profile?.role as 'admin' | 'standard') || 'standard',
  }
}

// Build UserContext with organization context (for org-specific operations)
// Uses regular client for auth, service role for data (bypasses RLS - ABAC handles authorization)
export async function buildUserContextWithOrg(organizationId: string): Promise<UserContext | null> {
  const authClient = await createClient()
  const supabase = createServiceRoleClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    console.error('buildUserContextWithOrg: No authenticated user')
    return null
  }

  // Get user's profile for role (single profiles table)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('buildUserContextWithOrg: Profile query error', profileError)
    return null
  }

  // Get user's membership in the specified org
  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .single()

  if (membershipError) {
    console.error('buildUserContextWithOrg: Membership query error', membershipError)
    // Return context without org info - ABAC will deny if org membership is required
  }

  return {
    id: user.id,
    globalRole: (profile?.role as 'admin' | 'standard') || 'standard',
    organizationId: membership?.organization_id,
    organizationRole: membership?.role as 'owner' | 'moderator' | 'member' | undefined,
  }
}
