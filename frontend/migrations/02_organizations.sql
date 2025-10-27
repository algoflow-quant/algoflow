CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    avatar_url TEXT,
    description TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'pro', 'team', 'enterprise', 'admin')),
    type TEXT NOT NULL DEFAULT 'N/A' CHECK (type IN ('personal', 'education', 'startup', 'fund', 'enterprise', 'research', 'n/a')),
    credits_limit INTEGER NOT NULL DEFAULT 1000,
    credits_balance INTEGER NOT NULL DEFAULT 1000,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can create organizations
CREATE POLICY "Users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Users can update their own organizations (restricted fields)
CREATE POLICY "Users can update their own organizations"
    ON organizations FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (
        auth.uid() = owner_id AND
        -- Prevent users from modifying protected fields
        id = (SELECT id FROM organizations WHERE id = organizations.id) AND
        owner_id = (SELECT owner_id FROM organizations WHERE id = organizations.id) AND
        plan = (SELECT plan FROM organizations WHERE id = organizations.id) AND
        type = (SELECT type FROM organizations WHERE id = organizations.id) AND
        credits_limit = (SELECT credits_limit FROM organizations WHERE id = organizations.id) AND
        credits_balance = (SELECT credits_balance FROM organizations WHERE id = organizations.id) AND
        created_at = (SELECT created_at FROM organizations WHERE id = organizations.id)
    );

-- Admins can update any organization including protected fields
CREATE POLICY "Admins can update any organization"
    ON organizations FOR UPDATE
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin')
    )
    WITH CHECK (true);

-- Users can read organizations they own (member policy added in migration 03)
CREATE POLICY "Users can read their organizations"
    ON organizations FOR SELECT
    USING (
        owner_id = (SELECT id FROM profiles WHERE id = auth.uid())
    );

-- Enable realtime for organizations table
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
