-- Host Applications Table
-- Run this in your Supabase SQL Editor

-- Create host_applications table
CREATE TABLE IF NOT EXISTS host_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  hosting_experience TEXT,
  hosting_style TEXT,
  equipment TEXT,
  availability TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_host_applications_user_id ON host_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_host_applications_status ON host_applications(status);

-- Enable RLS
ALTER TABLE host_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own host applications" ON host_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own host applications" ON host_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all host applications" ON host_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_ceo = true)
  );

CREATE POLICY "Admins can update host applications" ON host_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_ceo = true)
  );

-- Add a badge type for hosts in user_badges if needed
-- This is optional - hosts might just get is_host flag or a badge
