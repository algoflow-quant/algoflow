// Organization type matching database schema
export interface Organization {
  id: string
  name: string
  owner_id: string
  avatar_url: string | null
  description: string | null
  plan: 'free' | 'standard' | 'pro' | 'team' | 'enterprise' | 'admin'
  type: 'personal' | 'education' | 'startup' | 'fund' | 'enterprise' | 'research' | 'n/a'
  credits_limit: number
  credits_balance: number
  settings: Record<string, any>
  created_at: string
  updated_at: string
}
