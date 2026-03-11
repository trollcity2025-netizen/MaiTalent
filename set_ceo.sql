-- Update trollcity2025@gmail.com to be CEO (and optionally admin)
-- Run this in your Supabase SQL Editor

UPDATE public.users 
SET is_ceo = true, is_admin = true 
WHERE email = 'trollcity2025@gmail.com';

-- Verify the update
SELECT id, username, email, is_ceo, is_admin 
FROM public.users 
WHERE email = 'trollcity2025@gmail.com';
