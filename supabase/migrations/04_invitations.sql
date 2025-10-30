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

-- No RLS needed - all queries use service role which bypasses RLS
-- Authorization handled by ABAC in application layer

-- Auto-update updated_at timestamp (uses universal function from 00)
CREATE TRIGGER trigger_update_invitation_timestamp
    BEFORE UPDATE ON organization_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Broadcast changes via realtime.send() (uses universal function from 00)
CREATE TRIGGER trigger_broadcast_organization_invitations_change
    AFTER INSERT OR UPDATE OR DELETE ON organization_invitations
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_change();

-- Auto-create notification when invitation is deleted after accept/decline
-- Note: Application deletes invitations after accept/decline, so we detect via DELETE trigger
-- We check if a new member was just created (accept) or not (decline) to determine the action
CREATE OR REPLACE FUNCTION public.handle_invitation_deleted()
RETURNS TRIGGER AS $$
DECLARE
    org_name TEXT;
    invitee_name TEXT;
    was_accepted BOOLEAN;
BEGIN
    -- Get organization name
    SELECT name INTO org_name FROM public.organizations WHERE id = OLD.organization_id;

    -- Get invitee's name from their profile
    SELECT COALESCE(full_name, username) INTO invitee_name
    FROM public.profiles
    WHERE email = OLD.email;

    -- Check if the user just joined the organization (indicates acceptance)
    -- Look for a member created in the last second with matching criteria
    SELECT EXISTS(
        SELECT 1 FROM public.organization_members
        WHERE organization_id = OLD.organization_id
        AND user_id IN (SELECT id FROM public.profiles WHERE email = OLD.email)
        AND joined_at > NOW() - INTERVAL '5 seconds'
    ) INTO was_accepted;

    -- Notify the person who sent the invitation (if they still exist)
    IF OLD.invited_by IS NOT NULL THEN
        IF was_accepted THEN
            INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
            VALUES (
                OLD.invited_by,
                'invitation',
                'Invitation Accepted',
                COALESCE(invitee_name, OLD.email) || ' has joined ' || COALESCE(org_name, 'your organization'),
                jsonb_build_object(
                    'organization_id', OLD.organization_id,
                    'organization_name', org_name,
                    'invitee_email', OLD.email,
                    'invitee_name', invitee_name,
                    'status', 'accepted'
                ),
                '/dashboard/' || OLD.organization_id || '/members'
            );
        ELSE
            -- Only notify on decline if invitation was still pending (not expired/cancelled)
            IF OLD.status = 'pending' THEN
                INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
                VALUES (
                    OLD.invited_by,
                    'invitation',
                    'Invitation Declined',
                    COALESCE(invitee_name, OLD.email) || ' declined your invitation to ' || COALESCE(org_name, 'your organization'),
                    jsonb_build_object(
                        'organization_id', OLD.organization_id,
                        'organization_name', org_name,
                        'invitee_email', OLD.email,
                        'invitee_name', invitee_name,
                        'status', 'declined'
                    ),
                    '/dashboard/' || OLD.organization_id || '/settings'
                );
            END IF;
        END IF;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_invitation_deleted ON organization_invitations;
CREATE TRIGGER on_invitation_deleted
    AFTER DELETE ON organization_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_invitation_deleted();
