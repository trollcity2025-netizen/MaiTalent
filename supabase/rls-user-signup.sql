-- RLS Policies for User Signup
-- This ensures users can sign up and have their profile created

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read users (needed for viewing performer profiles)
DROP POLICY IF EXISTS "Users can be viewed by everyone" ON public.users;
CREATE POLICY "Users can be viewed by everyone" ON public.users FOR SELECT USING (true);

-- Policy: Allow authenticated users to insert their own user record
DROP POLICY IF EXISTS "Users can be inserted by authenticated users" ON public.users;
CREATE POLICY "Users can be inserted by authenticated users" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy: Allow users to update their own profile
DROP POLICY IF EXISTS "Users can be updated by owner" ON public.users;
CREATE POLICY "Users can be updated by owner" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Policy: Allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);

-- Update the handle_new_user function to use SECURITY DEFINER
-- This gives it elevated privileges to insert into the users table
-- Also ensures the email is included (which is required by the users table)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_ceo_email BOOLEAN := false;
BEGIN
    -- Check if this is the CEO email (server-side check only)
    IF NEW.email = 'trollcity2025@gmail.com' THEN
        is_ceo_email := true;
    END IF;
    
    -- Create user profile with email (required field)
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
$$ SECURITY DEFINER LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
