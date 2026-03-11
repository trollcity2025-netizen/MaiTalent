-- MaiTalent Feature Migrations
-- Run this in your Supabase SQL Editor to add new features
-- Features: Follows, Performer Applications, Block/Report, Real-time enhancements

-- ============================================
-- FIX USERS TABLE RLS FOR ADMIN DASHBOARD
-- ============================================

-- Ensure users can be viewed by everyone (for admin dashboard)
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can be viewed by everyone' 
    AND tablename = 'users'
  ) THEN
    CREATE POLICY "Users can be viewed by everyone" ON users FOR SELECT USING (true);
  END IF;
END $;

-- Also ensure user_badges can be read
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'User badges can be viewed by everyone' 
    AND tablename = 'user_badges'
  ) THEN
    CREATE POLICY "User badges can be viewed by everyone" ON user_badges FOR SELECT USING (true);
  END IF;
END $;

-- ============================================
-- USER FOLLOWS SYSTEM
-- ============================================

-- Create user_follows table for follower/following system
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Add indexes for follows
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Enable RLS
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follows
CREATE POLICY "Users can view their own follows" ON user_follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can follow others" ON user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ============================================
-- BLOCKED USERS
-- ============================================

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked users
CREATE POLICY "Users can view their own blocked users" ON blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others" ON blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock" ON blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- ============================================
-- REPORTED USERS
-- ============================================

-- Create user_reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('spam', 'harassment', 'inappropriate', 'fake_account', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);

-- Enable RLS
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
CREATE POLICY "Users can view their own reports" ON user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON user_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_ceo = true)
  );

CREATE POLICY "Admins can update reports" ON user_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_ceo = true)
  );

-- ============================================
-- PERFORMER APPLICATIONS (for auditions/queue)
-- ============================================

-- Create performer_applications table
CREATE TABLE IF NOT EXISTS performer_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Application details
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  talent_category TEXT NOT NULL,
  bio TEXT,
  video_url TEXT,
  availability TEXT,
  -- PayPal payout details (must match)
  paypal_email TEXT NOT NULL,
  paypal_verified BOOLEAN DEFAULT false,
  -- Application status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'bypassed')),
  denial_reason TEXT,
  -- Review info
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  -- For resubmission timing
  last_attempt_at TIMESTAMPTZ,
  attempts_count INTEGER DEFAULT 0,
  -- CEO bypass
  bypassed_by UUID REFERENCES auth.users(id),
  bypassed_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_performer_applications_user ON performer_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_performer_applications_status ON performer_applications(status);

-- Enable RLS
ALTER TABLE performer_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performer applications
CREATE POLICY "Users can view their own applications" ON performer_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications" ON performer_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications when pending" ON performer_applications
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND status = 'pending'
  );

-- Judges can view all performer applications
CREATE POLICY "Judges can view all performer applications" ON performer_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = auth.uid() AND badge_type = 'judge')
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_ceo = true)
  );

-- Judges can update applications
CREATE POLICY "Judges can update performer applications" ON performer_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = auth.uid() AND badge_type = 'judge')
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_ceo = true)
  );

-- ============================================
-- UPDATE JUDGE APPLICATIONS TABLE
-- ============================================

-- Add denial_reason column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'judge_applications' AND column_name = 'denial_reason') THEN
    ALTER TABLE judge_applications ADD COLUMN denial_reason TEXT;
  END IF;
END $$;

-- Add last_attempt_at for resubmission timing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'judge_applications' AND column_name = 'last_attempt_at') THEN
    ALTER TABLE judge_applications ADD COLUMN last_attempt_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- ADD COLUMNS TO USERS TABLE FOR PERFORMER INFO
-- ============================================

-- Add date_of_birth to users if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'date_of_birth') THEN
    ALTER TABLE users ADD COLUMN date_of_birth DATE;
  END IF;
END $$;

-- Add is_judge to users if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_judge') THEN
    ALTER TABLE users ADD COLUMN is_judge BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add is_host to users if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_host') THEN
    ALTER TABLE users ADD COLUMN is_host BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- ADD COLUMNS TO SHOW QUEUE FOR APPLICATION REQUIREMENT
-- ============================================

-- Add performer_application_id to show_queue if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'show_queue' AND column_name = 'performer_application_id') THEN
    ALTER TABLE show_queue ADD COLUMN performer_application_id UUID REFERENCES performer_applications(id);
  END IF;
END $$;

-- Add requires_application to shows table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shows' AND column_name = 'requires_application') THEN
    ALTER TABLE shows ADD COLUMN requires_application BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- ONE SIGNAL NOTIFICATIONS TABLE
-- ============================================

-- Create user_notifications table if not exists (for OneSignal mapping)
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  onesignal_player_id TEXT,
  device_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_player ON user_notifications(onesignal_player_id);

-- Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own notifications" ON user_notifications
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- INTERNAL NOTIFICATIONS TABLE
-- ============================================

-- Create notifications table for in-app notifications if not exists
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications for themselves" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- REAL-TIME ENABLED TABLES
-- ============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_follows;
ALTER PUBLICATION supabase_realtime ADD TABLE blocked_users;
ALTER PUBLICATION supabase_realtime ADD TABLE user_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE performer_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- ============================================
-- FUNCTIONS FOR FOLLOW/UNF===========

-- FunctionOLLOW
-- ================================= to follow a user and update follower counts
CREATE OR REPLACE FUNCTION follow_user(p_follower_id UUID, p_following_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Prevent self-follow
  IF p_follower_id = p_following_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  -- Check if already following
  IF EXISTS (SELECT 1 FROM user_follows WHERE follower_id = p_follower_id AND following_id = p_following_id) THEN
    RAISE EXCEPTION 'Already following this user';
  END IF;

  -- Check if blocked
  IF EXISTS (SELECT 1 FROM blocked_users WHERE blocker_id = p_following_id AND blocked_id = p_follower_id) THEN
    RAISE EXCEPTION 'You cannot follow this user';
  END IF;

  -- Insert follow
  INSERT INTO user_follows (follower_id, following_id) VALUES (p_follower_id, p_following_id);

  -- Update follower count for the user being followed
  UPDATE users SET followers = COALESCE(followers, 0) + 1 WHERE id = p_following_id;

  -- Update following count for the follower
  UPDATE users SET following = COALESCE(following, 0) + 1 WHERE id = p_follower_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unfollow a user and update counts
CREATE OR REPLACE FUNCTION unfollow_user(p_follower_id UUID, p_following_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if following
  IF NOT EXISTS (SELECT 1 FROM user_follows WHERE follower_id = p_follower_id AND following_id = p_following_id) THEN
    RAISE EXCEPTION 'Not following this user';
  END IF;

  -- Delete follow
  DELETE FROM user_follows WHERE follower_id = p_follower_id AND following_id = p_following_id;

  -- Update follower count for the user being unfollowed
  UPDATE users SET followers = GREATEST(COALESCE(followers, 0) - 1, 0) WHERE id = p_following_id;

  -- Update following count for the follower
  UPDATE users SET following = GREATEST(COALESCE(following, 0) - 1, 0) WHERE id = p_follower_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION FOR BLOCKING USER
-- ============================================

CREATE OR REPLACE FUNCTION block_user(p_blocker_id UUID, p_blocked_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  -- Prevent self-block
  IF p_blocker_id = p_blocked_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  -- Check if already blocked
  IF EXISTS (SELECT 1 FROM blocked_users WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id) THEN
    RAISE EXCEPTION 'User already blocked';
  END IF;

  -- Insert block
  INSERT INTO blocked_users (blocker_id, blocked_id, reason) VALUES (p_blocker_id, p_blocked_id, p_reason);

  -- Remove any existing follows between them
  DELETE FROM user_follows WHERE (follower_id = p_blocker_id AND following_id = p_blocked_id)
    OR (follower_id = p_blocked_id AND following_id = p_blocker_id);

  -- Update follower/following counts
  UPDATE users SET followers = GREATEST(COALESCE(followers, 0) - 1, 0) 
    WHERE id = p_blocked_id AND EXISTS (SELECT 1 FROM user_follows WHERE follower_id = p_blocker_id AND following_id = p_blocked_id);
  UPDATE users SET following = GREATEST(COALESCE(following, 0) - 1, 0) 
    WHERE id = p_blocker_id AND EXISTS (SELECT 1 FROM user_follows WHERE follower_id = p_blocked_id AND following_id = p_blocker_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION FOR CHECKING RESUBMISSION ELIGIBILITY
-- ============================================

CREATE OR REPLACE FUNCTION can_resubmit_performer_application(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_application RECORD;
  v_hours_since_last_attempt INTEGER;
BEGIN
  -- Get the last application attempt
  SELECT * INTO v_last_application 
  FROM performer_applications 
  WHERE user_id = p_user_id 
  ORDER BY created_at DESC 
  LIMIT 1;

  -- If no previous application, can apply
  IF v_last_application IS NULL THEN
    RETURN true;
  END IF;

  -- If last application was approved, cannot apply again
  IF v_last_application.status = 'approved' THEN
    RETURN false;
  END IF;

  -- If denied and not bypassed, check 48-hour rule
  IF v_last_application.status = 'denied' AND v_last_application.bypassed_by IS NULL THEN
    -- Calculate hours since last attempt
    SELECT EXTRACT(EPOCH FROM (NOW() - v_last_application.created_at))/3600 INTO v_hours_since_last_attempt;
    
    -- Allow resubmission after 48 hours
    IF v_hours_since_last_attempt >= 48 THEN
      RETURN true;
    ELSE
      RETURN false;
    END IF;
  END IF;

  -- If bypassed by CEO, can always resubmit
  IF v_last_application.status = 'denied' AND v_last_application.bypassed_by IS NOT NULL THEN
    RETURN true;
  END IF;

  -- Default: allow resubmission
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION follow_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unfollow_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION block_user(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_resubmit_performer_application(UUID) TO authenticated;

-- ============================================
-- DONE
-- ============================================

SELECT 'MaiTalent Feature Migrations completed successfully!' as status;
