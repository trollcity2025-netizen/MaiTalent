-- Add missing user role columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_ceo BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_performer BOOLEAN DEFAULT false;

-- Add INSERT policy for users table (allow users to create their own profile)
DROP POLICY IF EXISTS "Users can be inserted by authenticated users" ON public.users;
CREATE POLICY "Users can be inserted by authenticated users" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
