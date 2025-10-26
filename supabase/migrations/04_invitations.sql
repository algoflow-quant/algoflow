CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('member', 'moderator')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_invitations_organization ON public.organization_invitations(organization_id);
CREATE INDEX idx_invitations_email ON public.organization_invitations(email);
CREATE INDEX idx_invitations_status ON public.organization_invitations(status);
CREATE INDEX idx_invitations_expires_at ON public.organization_invitations(expires_at);

-- Prevent duplicate pending invitations (allows re-inviting after decline/accept/expire)
CREATE UNIQUE INDEX idx_unique_pending_invitation
    ON public.organization_invitations(organization_id, email)
    WHERE status = 'pending';


-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations to their email
CREATE POLICY "Users can view their own invitations"
    ON organization_invitations FOR SELECT
    USING (
        email = (SELECT email FROM profiles WHERE id = auth.uid())
    );

-- Organization owners and moderators can view org invitations
CREATE POLICY "Org members can view organization invitations"
    ON organization_invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organization_invitations.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'moderator')
        )
    );

-- Organization owners and moderators can create invitations
CREATE POLICY "Org members can create invitations"
    ON organization_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organization_invitations.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'moderator')
        )
        AND (
            -- Owners can invite anyone with any role
            (SELECT role FROM organization_members
             WHERE organization_id = organization_invitations.organization_id
             AND user_id = auth.uid()) = 'owner'
            OR
            -- Moderators can only invite as 'member'
            (
                (SELECT role FROM organization_members
                 WHERE organization_id = organization_invitations.organization_id
                 AND user_id = auth.uid()) = 'moderator'
                AND organization_invitations.role = 'member'
            )
        )
    );

-- Users can update their own invitations (accept/decline)
CREATE POLICY "Users can update their own invitations"
    ON organization_invitations FOR UPDATE
    USING (
        email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        email = (SELECT email FROM profiles WHERE id = auth.uid())
        AND status IN ('accepted', 'declined')
    );

-- Organization owners and moderators can cancel invitations
CREATE POLICY "Org members can cancel invitations"
    ON organization_invitations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organization_invitations.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'moderator')
        )
    )
    WITH CHECK (
        status = 'cancelled'
    );

-- Users can delete their own invitations (decline by deletion)
CREATE POLICY "Users can delete their own invitations"
    ON organization_invitations FOR DELETE
    USING (
        email = (SELECT email FROM profiles WHERE id = auth.uid())
        AND status = 'pending'
    );

-- Users can add themselves when accepting an invitation
CREATE POLICY "Users can accept invitations"
    ON organization_members FOR INSERT
    WITH CHECK (
        user_id = (SELECT id FROM profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM organization_invitations
            WHERE organization_id = organization_members.organization_id
            AND email = (SELECT email FROM profiles WHERE id = (SELECT id FROM profiles WHERE id = auth.uid()))
            AND status = 'pending'
            AND expires_at > NOW()
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

-- Function to accept invitation and create membership
CREATE OR REPLACE FUNCTION accept_invitation(invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    inv_record RECORD;
    user_id_val UUID;
BEGIN
    -- Get the invitation details
    SELECT * INTO inv_record
    FROM organization_invitations
    WHERE id = invitation_id
    AND status = 'pending'
    AND expires_at > NOW()
    AND email = (SELECT email FROM profiles WHERE id = auth.uid());

    -- Check if invitation exists and is valid
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Get user ID
    user_id_val := auth.uid();

    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = inv_record.organization_id
        AND user_id = user_id_val
    ) THEN
        -- Update invitation status to accepted anyway
        UPDATE organization_invitations
        SET status = 'accepted'
        WHERE id = invitation_id;

        RETURN FALSE;
    END IF;

    -- Create organization membership
    INSERT INTO organization_members (
        organization_id,
        user_id,
        role,
        invited_by
    ) VALUES (
        inv_record.organization_id,
        user_id_val,
        inv_record.role,
        inv_record.invited_by
    );

    -- Update invitation status
    UPDATE organization_invitations
    SET status = 'accepted'
    WHERE id = invitation_id;

    -- Delete the invitation notification
    DELETE FROM notifications
    WHERE user_id = user_id_val
    AND type = 'invitation'
    AND data->>'invitation_id' = invitation_id::text;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline invitation
CREATE OR REPLACE FUNCTION decline_invitation(invitation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE organization_invitations
    SET status = 'declined'
    WHERE id = invitation_id
    AND status = 'pending'
    AND expires_at > NOW()
    AND email = (SELECT email FROM profiles WHERE id = auth.uid());

    -- Delete the invitation notification
    DELETE FROM notifications
    WHERE user_id = auth.uid()
    AND type = 'invitation'
    AND data->>'invitation_id' = invitation_id::text;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create notification when invitation is sent
CREATE OR REPLACE FUNCTION notify_on_invitation()
RETURNS TRIGGER AS $$
DECLARE
    invitee_user_id UUID;
    org_name TEXT;
BEGIN
    -- Check if invitee already has an account (use profiles instead of auth.users)
    SELECT id INTO invitee_user_id
    FROM profiles
    WHERE email = NEW.email;

    -- Only create notification if user exists
    IF invitee_user_id IS NOT NULL THEN
        -- Get organization name
        SELECT name INTO org_name
        FROM organizations
        WHERE id = NEW.organization_id;

        -- Create notification
        PERFORM create_notification(
            invitee_user_id,
            'invitation',
            'Organization Invitation',
            'You have been invited to join ' || org_name,
            jsonb_build_object(
                'invitation_id', NEW.id,
                'organization_id', NEW.organization_id,
                'role', NEW.role
            ),
            '/invitations'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_invitation
    AFTER INSERT ON organization_invitations
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_on_invitation();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE organization_invitations;