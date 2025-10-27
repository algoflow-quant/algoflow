CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
    invited_by UUID REFERENCES auth.users(id),
    joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, user_id)
);

-- Audit trail for role changes
CREATE TABLE organization_member_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    old_role TEXT,
    new_role TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('added', 'role_changed', 'removed', 'left', 'ownership_transferred')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_member_history_org_id ON organization_member_history(organization_id);
CREATE INDEX idx_org_member_history_user_id ON organization_member_history(user_id);

-- Helper function to check if user is member of org (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_organization_member(org_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
        AND user_id = check_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role in org (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_org_role(org_id UUID, check_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM organization_members
    WHERE organization_id = org_id
    AND user_id = check_user_id;

    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_member_history ENABLE ROW LEVEL SECURITY;

-- Members can view other members in their org (using helper function to avoid recursion)
CREATE POLICY "Members can view organization members"
    ON organization_members FOR SELECT
    USING (
        public.is_organization_member(organization_id, (SELECT id FROM profiles WHERE id = auth.uid()))
    );

-- Members can view audit history of their org
CREATE POLICY "Members can view organization history"
    ON organization_member_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = organization_member_history.organization_id
            AND om.user_id = (SELECT id FROM profiles WHERE id = auth.uid())
        )
    );

-- Owners and moderators can invite members (moderators can only add regular members)
CREATE POLICY "Owners and moderators can add members"
    ON organization_members FOR INSERT
    WITH CHECK (
        public.get_user_org_role(organization_id, (SELECT id FROM profiles WHERE id = auth.uid())) IN ('owner', 'moderator')
        AND (
            -- Moderators can only add regular members
            role = 'member'
            OR
            -- Owners can add moderators or members (not owners - use transfer for that)
            (
                role IN ('moderator', 'member') AND
                public.get_user_org_role(organization_id, (SELECT id FROM profiles WHERE id = auth.uid())) = 'owner'
            )
        )
    );

-- Only owners can manage member roles (but cannot create new owners)
CREATE POLICY "Owners can manage member roles"
    ON organization_members FOR UPDATE
    USING (
        public.get_user_org_role(organization_id, (SELECT id FROM profiles WHERE id = auth.uid())) = 'owner'
    )
    WITH CHECK (
        -- Cannot create new owners through role change (use transfer ownership instead)
        role IN ('moderator', 'member')
    );

-- Owners and moderators can remove members (with restrictions)
CREATE POLICY "Owners and moderators can remove members"
    ON organization_members FOR DELETE
    USING (
        public.get_user_org_role(organization_id, (SELECT id FROM profiles WHERE id = auth.uid())) IN ('owner', 'moderator')
        AND user_id != (SELECT id FROM profiles WHERE id = auth.uid())  -- Cannot remove yourself
        AND role != 'owner'  -- Cannot remove owners
    );

-- Members can leave the organization themselves (but owner cannot leave)
CREATE POLICY "Members can leave organization"
    ON organization_members FOR DELETE
    USING (
        (SELECT id FROM profiles WHERE id = auth.uid()) = user_id AND
        role != 'owner'  -- Owners must transfer ownership before leaving
    );

-- Function to log member changes to history
CREATE OR REPLACE FUNCTION public.log_member_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.organization_member_history (
            organization_id, user_id, old_role, new_role, changed_by, action
        ) VALUES (
            OLD.organization_id,
            OLD.user_id,
            OLD.role,
            OLD.role,  -- Keep the role they had when removed
            COALESCE(auth.uid(), OLD.user_id),
            CASE
                WHEN auth.uid() = OLD.user_id THEN 'left'
                ELSE 'removed'
            END
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.role != NEW.role THEN
            INSERT INTO public.organization_member_history (
                organization_id, user_id, old_role, new_role, changed_by, action
            ) VALUES (
                NEW.organization_id,
                NEW.user_id,
                OLD.role,
                NEW.role,
                auth.uid(),
                'role_changed'
            );
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.organization_member_history (
            organization_id, user_id, old_role, new_role, changed_by, action
        ) VALUES (
            NEW.organization_id,
            NEW.user_id,
            NULL,
            NEW.role,
            COALESCE(NEW.invited_by, NEW.user_id),
            'added'
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Trigger to log all member changes
DROP TRIGGER IF EXISTS on_member_change ON organization_members;
CREATE TRIGGER on_member_change
    AFTER INSERT OR UPDATE OR DELETE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.log_member_change();

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

-- Transfer ownership from current owner to another member
CREATE OR REPLACE FUNCTION public.transfer_organization_ownership(
    p_organization_id UUID,
    p_new_owner_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_current_owner_id UUID;
    v_new_owner_old_role TEXT;
BEGIN
    -- Get current owner ID
    SELECT owner_id INTO v_current_owner_id
    FROM organizations
    WHERE id = p_organization_id;

    -- Check organization exists
    IF v_current_owner_id IS NULL THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;

    -- Check caller is current owner
    IF auth.uid() != v_current_owner_id THEN
        RAISE EXCEPTION 'Only current owner can transfer ownership';
    END IF;

    -- Check not transferring to self
    IF p_new_owner_id = v_current_owner_id THEN
        RAISE EXCEPTION 'Cannot transfer ownership to yourself';
    END IF;

    -- Check new owner is a member and get their current role
    SELECT role INTO v_new_owner_old_role
    FROM organization_members
    WHERE organization_id = p_organization_id
    AND user_id = p_new_owner_id;

    IF v_new_owner_old_role IS NULL THEN
        RAISE EXCEPTION 'New owner must be a member of the organization';
    END IF;

    -- Check new owner is not already owner
    IF v_new_owner_old_role = 'owner' THEN
        RAISE EXCEPTION 'User is already the owner';
    END IF;

    -- Demote current owner to moderator
    UPDATE organization_members
    SET role = 'moderator'
    WHERE organization_id = p_organization_id
    AND user_id = v_current_owner_id;

    -- Promote new owner
    UPDATE organization_members
    SET role = 'owner'
    WHERE organization_id = p_organization_id
    AND user_id = p_new_owner_id;

    -- Update organizations table
    UPDATE organizations
    SET owner_id = p_new_owner_id, updated_at = now()
    WHERE id = p_organization_id;

    -- Log ownership transfer in audit history
    INSERT INTO public.organization_member_history (
        organization_id, user_id, old_role, new_role, changed_by, action
    ) VALUES (
        p_organization_id,
        p_new_owner_id,
        v_new_owner_old_role,
        'owner',
        v_current_owner_id,
        'ownership_transferred'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update organizations policy to allow members to view orgs they belong to
DROP POLICY IF EXISTS "Users can read their organizations" ON organizations;
CREATE POLICY "Users can read their organizations"
    ON organizations FOR SELECT
    USING (
        owner_id = (SELECT id FROM profiles WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organizations.id
            AND user_id = (SELECT id FROM profiles WHERE id = auth.uid())
        )
    );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE organization_members;
ALTER PUBLICATION supabase_realtime ADD TABLE organization_member_history;

-- Enable REPLICA IDENTITY FULL so DELETE events include the old row data
ALTER TABLE organization_members REPLICA IDENTITY FULL;
ALTER TABLE organization_member_history REPLICA IDENTITY FULL;