-- Organization members table for ABAC (no RLS, no audit history)
-- Hard deletes - removed members are truly deleted (no soft delete status)
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

-- No RLS needed - all queries use service role which bypasses RLS
-- Authorization handled by ABAC in application layer

-- Auto-update updated_at timestamp (uses universal function from 07)
CREATE TRIGGER trigger_update_organization_members_timestamp
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- Broadcast changes via realtime.send() (uses universal function from 00)
CREATE TRIGGER trigger_broadcast_organization_members_change
    AFTER INSERT OR UPDATE OR DELETE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_change();

-- Auto-create notification when member is removed from organization
CREATE OR REPLACE FUNCTION public.handle_member_removed()
RETURNS TRIGGER AS $$
DECLARE
    org_name TEXT;
BEGIN
    -- Get organization name for the notification message
    SELECT name INTO org_name FROM public.organizations WHERE id = OLD.organization_id;

    -- Create notification for the removed user
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    VALUES (
        OLD.user_id,
        'removed_from_org',
        'Removed from Organization',
        'You have been removed from ' || COALESCE(org_name, 'an organization'),
        jsonb_build_object(
            'organization_id', OLD.organization_id,
            'organization_name', org_name,
            'previous_role', OLD.role
        ),
        '/dashboard'
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_member_removed ON organization_members;
CREATE TRIGGER on_member_removed
    AFTER DELETE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_member_removed();
