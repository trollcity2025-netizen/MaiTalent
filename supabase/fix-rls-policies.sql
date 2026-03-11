-- Fix RLS policies for banned_ips and performer_applications tables
-- Run this in your Supabase SQL Editor

-- ============================================
-- PERFORMER APPLICATIONS TABLE
-- ============================================

-- Create performer_applications table if not exists
CREATE TABLE IF NOT EXISTS public.performer_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT,
  talent_category TEXT,
  experience TEXT,
  social_links JSONB DEFAULT '{}',
  video_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.performer_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own applications" ON public.performer_applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.performer_applications;
DROP POLICY IF EXISTS "Users can update their own applications when pending" ON public.performer_applications;
DROP POLICY IF EXISTS "Judges can view all performer applications" ON public.performer_applications;
DROP POLICY IF EXISTS "Judges can update performer applications" ON public.performer_applications;
DROP POLICY IF EXISTS "Anyone can view applications" ON public.performer_applications;
DROP POLICY IF EXISTS "Anyone can create applications" ON public.performer_applications;
DROP POLICY IF EXISTS "Anyone can update applications" ON public.performer_applications;
DROP POLICY IF EXISTS "Anyone can delete applications" ON public.performer_applications;

-- Simpler RLS policies for performer_applications
-- Allow anyone to view (public applications list)
CREATE POLICY "Anyone can view performer applications" ON public.performer_applications
  FOR SELECT USING (true);

-- Allow authenticated users to create applications
CREATE POLICY "Authenticated users can create performer applications" ON public.performer_applications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own applications
CREATE POLICY "Users can update own performer applications" ON public.performer_applications
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow admins to delete applications
CREATE POLICY "Admins can delete performer applications" ON public.performer_applications
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- BANNED IPS TABLE
-- ============================================

-- Create banned_ips table if not exists
CREATE TABLE IF NOT EXISTS public.banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  ip_network TEXT,
  reason TEXT,
  banned_by UUID REFERENCES auth.users(id),
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on banned_ips
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

-- Drop the problematic policy that references user_roles
DROP POLICY IF EXISTS "Only CEOs can manage banned IPs" ON public.banned_ips;
DROP POLICY IF EXISTS "Anyone can view banned_ips" ON public.banned_ips;
DROP POLICY IF EXISTS "Authenticated users can manage banned_ips" ON public.banned_ips;

-- Allow anyone to view banned IPs (for checking if IP is banned)
CREATE POLICY "Anyone can view banned_ips" ON public.banned_ips
  FOR SELECT USING (true);

-- Allow authenticated users to insert/update (restrict to admins later)
CREATE POLICY "Authenticated users can manage banned_ips" ON public.banned_ips
  FOR ALL USING (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_banned_ips_active ON public.banned_ips(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON public.banned_ips(ip_address) WHERE is_active = true;

-- ============================================
-- PRIVATE MESSAGES TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_paid_message BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Simpler RLS policies for private_messages
DROP POLICY IF EXISTS "Users can read their messages" ON public.private_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.private_messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON public.private_messages;

CREATE POLICY "Users can read their messages" ON public.private_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages" ON public.private_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their messages" ON public.private_messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON public.private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_receiver ON public.private_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created ON public.private_messages(created_at DESC);
