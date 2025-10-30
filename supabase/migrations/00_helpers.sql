-- Universal updated_at trigger function
-- Used by tables: profiles (01), organizations (02), organization_members (03), notifications (05), invitations (04)

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Universal realtime broadcast function
-- Routes broadcasts to appropriate per-org or per-user channels
-- Clients subscribe to specific channels (org-{id} or user-{id})
CREATE OR REPLACE FUNCTION broadcast_change()
RETURNS TRIGGER AS $$
DECLARE
    channel_name text;
    event_name text;
    record_data record;
BEGIN
    -- Use NEW for INSERT/UPDATE, OLD for DELETE
    record_data := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

    -- Route to appropriate channel based on table
    CASE TG_TABLE_NAME
        -- Organization-specific tables → org-{organization_id} channel
        WHEN 'organization_members' THEN
            channel_name := 'org-' || record_data.organization_id;
            event_name := 'members-change';

        WHEN 'organizations' THEN
            channel_name := 'org-' || record_data.id;
            event_name := 'org-change';

        -- User-specific tables → user-{user_id} channel
        WHEN 'notifications' THEN
            channel_name := 'user-' || record_data.user_id;
            event_name := 'notifications-change';

        WHEN 'profiles' THEN
            channel_name := 'user-' || record_data.id;
            event_name := 'profile-change';

        -- Invitations: broadcast to inviter's channel
        WHEN 'invitations' THEN
            channel_name := 'user-' || record_data.invited_by;
            event_name := 'invitations-change';

        ELSE
            -- Fallback: use global channel
            channel_name := 'db-changes';
            event_name := 'table-change';
    END CASE;

    -- Send broadcast to specific channel
    PERFORM realtime.send(
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP
        ),
        event_name,
        channel_name,
        false  -- public broadcast
    );

    -- Must return NEW for INSERT/UPDATE, OLD for DELETE
    RETURN record_data;
END;
$$ LANGUAGE plpgsql;
