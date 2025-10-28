-- Single organizations table with ABAC controlling field access
-- Members can read: name, avatar_url, description, type
-- Owner can update: name, avatar_url, description, type
-- Owner/Admin can read: plan, credits_limit, credits_balance, settings
-- Admin can update: plan, credits_limit, credits_balance (owner cannot change billing)
-- Owner can delete organization

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    avatar_url TEXT,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'N/A' CHECK (type IN ('personal', 'education', 'startup', 'fund', 'enterprise', 'research', 'n/a')),
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'pro', 'team', 'enterprise', 'admin')),
    credits_limit INTEGER NOT NULL DEFAULT 1000,
    credits_balance INTEGER NOT NULL DEFAULT 1000,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_org_owner ON organizations(owner_id);
CREATE INDEX idx_org_plan ON organizations(plan);

-- RLS enabled here, policy added in 03_organization_members.sql after members table exists
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
