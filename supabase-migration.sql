-- ============================================
-- MIGRATION: Terms & CEO System
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create terms_acceptances table
CREATE TABLE IF NOT EXISTS public.terms_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    terms_version TEXT NOT NULL,
    ip_address TEXT,
    accepted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user_id ON public.terms_acceptances(user_id);

-- Enable RLS
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Terms acceptances policies
DROP POLICY IF EXISTS "Users can view own terms acceptances" ON public.terms_acceptances;
CREATE POLICY "Users can view own terms acceptances" ON public.terms_acceptances FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert terms acceptances" ON public.terms_acceptances;
CREATE POLICY "Users can insert terms acceptances" ON public.terms_acceptances FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 2. Add terms acceptance fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- 3. Create trigger function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_ceo_email BOOLEAN := false;
BEGIN
    -- Check if this is the CEO email (server-side check only)
    IF NEW.email = 'trollcity2025@gmail.com' THEN
        is_ceo_email := true;
    END IF;
    
    -- Create user profile
    INSERT INTO public.users (
        id,
        username,
        email,
        coin_balance,
        is_admin,
        is_ceo,
        terms_accepted
    )
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            split_part(NEW.email, '@', 1),
            'user_' || LEFT(NEW.id::TEXT, 8)
        ),
        NEW.email,
        0,
        false,
        is_ceo_email,
        false
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Enable the trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Role hierarchy functions
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
    IF (SELECT is_ceo FROM public.users WHERE id = user_uuid) = true THEN
        RETURN 'ceo';
    ELSIF (SELECT is_admin FROM public.users WHERE id = user_uuid) = true THEN
        RETURN 'admin';
    ELSE
        RETURN 'user';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_role_action(target_user_id UUID, action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    auth_user_id UUID;
    user_role TEXT;
    target_is_ceo BOOLEAN;
BEGIN
    auth_user_id := auth.uid();
    user_role := get_user_role(auth_user_id);
    target_is_ceo := COALESCE((SELECT is_ceo FROM public.users WHERE id = target_user_id), false);
    
    IF user_role = 'ceo' THEN
        RETURN true;
    END IF;
    
    IF target_is_ceo AND user_role = 'admin' THEN
        RETURN false;
    END IF;
    
    IF user_role = 'admin' AND action IN ('moderate', 'ban', 'remove_content') THEN
        RETURN true;
    END IF;
    
    IF user_role = 'user' AND target_user_id = auth_user_id THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
