// Public organization data - members can read
export interface Organization {
  id: string
  name: string
  owner_id: string
  avatar_url: string | null
  description: string | null
  type: 'personal' | 'education' | 'startup' | 'fund' | 'enterprise' | 'research' | 'n/a'
  created_at: Date
  updated_at: Date
}

// Private organization settings - owner/admin only
export interface OrganizationSettings {
  id: string
  plan: 'free' | 'standard' | 'pro' | 'team' | 'enterprise' | 'admin'
  credits_limit: number
  credits_balance: number
  settings: Record<string, any>
  created_at: Date
  updated_at: Date
}

// Combined type for when you need both public + private data together
export interface OrganizationWithSettings extends Organization {
  plan: OrganizationSettings['plan']
  credits_limit: OrganizationSettings['credits_limit']
  credits_balance: OrganizationSettings['credits_balance']
  settings: OrganizationSettings['settings']
}
