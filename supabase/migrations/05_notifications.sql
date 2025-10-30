-- Notifications table for ABAC (no RLS)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('invitation', 'role_changed', 'removed_from_org', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = FALSE;

-- No RLS needed - all queries use service role which bypasses RLS
-- Authorization handled by ABAC in application layer

-- Auto-update updated_at timestamp (uses universal function from 00)
CREATE TRIGGER trigger_update_notification_timestamp
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Broadcast changes via realtime.send() (uses universal function from 00)
CREATE TRIGGER trigger_broadcast_notifications_change
    AFTER INSERT OR UPDATE OR DELETE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_change();
