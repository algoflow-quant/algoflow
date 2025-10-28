-- Organization members table for ABAC (no RLS, no audit history)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
    invited_by UUID REFERENCES profiles(id),
    joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);

-- RLS for Realtime subscriptions only
-- Application uses ABAC (service role bypasses RLS)
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_members_realtime_select"
  ON organization_members FOR SELECT
  USING (
    -- Can see own membership
    auth.uid() = user_id
    OR
    -- Can see other members if you're in the same org
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_member_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_member_timestamp
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_member_updated_at();

-- Auto-add owner as member when org is created
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_organization_created ON organizations;
CREATE TRIGGER on_organization_created
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_organization();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE organization_members;

-- Enable REPLICA IDENTITY FULL so DELETE events include the old row data
ALTER TABLE organization_members REPLICA IDENTITY FULL;

-- Add RLS policy for organizations table (now that members table exists)
CREATE POLICY "organizations_realtime_select"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
    )
  );
