-- Organization invitations table for ABAC (no RLS)
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('member', 'moderator')),
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_invitations_organization ON public.organization_invitations(organization_id);
CREATE INDEX idx_invitations_email ON public.organization_invitations(email);
CREATE INDEX idx_invitations_status ON public.organization_invitations(status);
CREATE INDEX idx_invitations_expires_at ON public.organization_invitations(expires_at);

-- Prevent duplicate pending invitations (allows re-inviting after decline/accept/expire)
CREATE UNIQUE INDEX idx_unique_pending_invitation
    ON public.organization_invitations(organization_id, email)
    WHERE status = 'pending';

-- RLS for Realtime subscriptions only
-- Application uses ABAC (service role bypasses RLS)
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_invitations_realtime_select"
  ON organization_invitations FOR SELECT
  USING (
    -- Can see invitations sent to your email
    auth.jwt() ->> 'email' = email
    OR
    -- Can see invitations for orgs you're a member of (to manage them)
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invitation_timestamp
    BEFORE UPDATE ON organization_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_invitation_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE organization_invitations;
