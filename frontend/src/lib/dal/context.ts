import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/dal/utils/prisma'
import type { UserContext } from '@/lib/abac/types'

// Build UserContext from Supabase auth session
// Uses Supabase for auth, Prisma for data queries
export async function buildUserContext(): Promise<UserContext | null> {
  const authClient = await createClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) return null

  // Get user's profile for role using Prisma
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { role: true },
  })

  return {
    id: user.id,
    globalRole: (profile?.role as 'admin' | 'standard') || 'standard',
  }
}

// Build UserContext with organization context (for org-specific operations)
// PERFORMANCE: Uses Prisma's include to fetch both member and profile data in one query
// Uses Supabase for auth, Prisma for data queries
export async function buildUserContextWithOrg(organizationId: string): Promise<UserContext | null> {
  const authClient = await createClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    console.error('buildUserContextWithOrg: No authenticated user')
    return null
  }

  // Fetch membership with profile data using Prisma (single query with JOIN)
  const member = await prisma.organization_members.findUnique({
    where: {
      organization_id_user_id: {
        organization_id: organizationId,
        user_id: user.id,
      },
    },
    include: {
      user: {
        select: { role: true },
      },
    },
  })

  if (!member) {
    // User not a member of this org - fetch profile for global role only
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    return {
      id: user.id,
      globalRole: (profile?.role as 'admin' | 'standard') || 'standard',
      organizationId: undefined,
      organizationRole: undefined,
    }
  }

  return {
    id: user.id,
    globalRole: (member.user.role as 'admin' | 'standard') || 'standard',
    organizationId: member.organization_id,
    organizationRole: member.role as 'owner' | 'moderator' | 'member',
  }
}
