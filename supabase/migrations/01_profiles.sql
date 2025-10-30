-- Single profiles table with ABAC controlling field access
-- Public fields: username, full_name, avatar_url, bio (anyone can read)
-- Private fields: email, role, last_seen_at (owner + admin only)

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'standard' CHECK (role IN ('standard', 'admin')),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_last_seen ON public.profiles(last_seen_at);

-- No RLS needed - all queries use service role which bypasses RLS
-- Authorization handled by ABAC in application layer

-- Auto-update updated_at timestamp (uses universal function from 07)
CREATE TRIGGER trigger_update_profiles_timestamp
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        'standard'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Broadcast changes via realtime.send() (uses universal function from 00)
CREATE TRIGGER trigger_broadcast_profiles_change
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_change();
