-- MaiTalent Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TERMS ACCEPTANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.terms_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    terms_version TEXT NOT NULL,
    ip_address TEXT,
    accepted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_terms_acceptances_user_id ON public.terms_acceptances(user_id);

-- Enable RLS
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Terms acceptances: Users can view their own, admins can view all
CREATE POLICY "Users can view own terms acceptances" ON public.terms_acceptances FOR SELECT 
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert terms acceptances" ON public.terms_acceptances FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Add terms acceptance fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- ============================================
-- USERS TABLE (Performers and Viewers)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar TEXT,
    bio TEXT,
    talent_category TEXT,
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    coin_balance INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_performer BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    is_ceo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_talent_category ON public.users(talent_category);
CREATE INDEX idx_users_followers ON public.users(followers DESC);

-- ============================================
-- SHOWS TABLE (Live Shows)
-- ============================================
CREATE TABLE IF NOT EXISTS public.shows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    host_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT CHECK (status IN ('scheduled', 'live', 'ended')) DEFAULT 'scheduled',
    viewer_count INTEGER DEFAULT 0,
    max_viewers INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    ticket_price INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_shows_status ON public.shows(status);
CREATE INDEX idx_shows_start_time ON public.shows(start_time);
CREATE INDEX idx_shows_host_id ON public.shows(host_id);

-- ============================================
-- PERFORMANCES TABLE (Individual Performances in a Show)
-- ============================================
CREATE TABLE IF NOT EXISTS public.performances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
    title TEXT,
    talent_category TEXT,
    votes INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('waiting', 'performing', 'completed')) DEFAULT 'waiting',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_performances_show_id ON public.performances(show_id);
CREATE INDEX idx_performances_user_id ON public.performances(user_id);
CREATE INDEX idx_performances_status ON public.performances(status);
CREATE INDEX idx_performances_votes ON public.performances(votes DESC);

-- ============================================
-- VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    performance_id UUID REFERENCES public.performances(id) ON DELETE CASCADE,
    vote_type TEXT CHECK (vote_type IN ('vote', 'super_vote')) DEFAULT 'vote',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_votes_performance_id ON public.votes(performance_id);
CREATE INDEX idx_votes_user_id ON public.votes(user_id);
CREATE UNIQUE INDEX idx_votes_user_performance ON public.votes(user_id, performance_id);

-- ============================================
-- AUDITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.auditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    talent_category TEXT NOT NULL,
    bio TEXT,
    video_url TEXT,
    availability TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_auditions_user_id ON public.auditions(user_id);
CREATE INDEX idx_auditions_status ON public.auditions(status);

-- ============================================
-- GIFTS TABLE (Virtual Gifts)
-- ============================================
CREATE TABLE IF NOT EXISTS public.gifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    performance_id UUID REFERENCES public.performances(id) ON DELETE SET NULL,
    gift_type TEXT NOT NULL,
    value INTEGER NOT NULL,
    coin_cost INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_gifts_sender_id ON public.gifts(sender_id);
CREATE INDEX idx_gifts_receiver_id ON public.gifts(receiver_id);
CREATE INDEX idx_gifts_performance_id ON public.gifts(performance_id);

-- ============================================
-- COIN PACKS TABLE (Available for Purchase)
-- ============================================
CREATE TABLE IF NOT EXISTS public.coin_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coins INTEGER NOT NULL,
    bonus_coins INTEGER DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default coin packs
INSERT INTO public.coin_packs (coins, bonus_coins, price, sort_order) VALUES
    (100, 0, 0.99, 1),
    (500, 25, 4.99, 2),
    (1000, 100, 9.99, 3),
    (2500, 500, 24.99, 4),
    (5000, 1500, 49.99, 5),
    (10000, 5000, 99.99, 6);

-- ============================================
-- PURCHASES TABLE (Coin Purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    coin_pack_id UUID REFERENCES public.coin_packs(id),
    custom_coins INTEGER,
    payment_method TEXT CHECK (payment_method IN ('paypal', 'stripe', 'google_pay')),
    payment_id TEXT,
    amount_paid DECIMAL(10, 2) NOT NULL,
    coins_purchased INTEGER NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX idx_purchases_status ON public.purchases(status);

-- ============================================
-- PAYOUTS TABLE (Creator Earnings)
-- ============================================
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    coins_converted INTEGER NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('paypal', 'bank_transfer')),
    payment_email TEXT,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payouts_user_id ON public.payouts(user_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_system_message BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chat_messages_show_id ON public.chat_messages(show_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- ============================================
-- FOLLOWERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Create indexes
CREATE INDEX idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX idx_followers_following_id ON public.followers(following_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- ============================================
-- JUDGE APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.judge_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    experience TEXT,
    qualifications TEXT,
    availability TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_judge_applications_user_id ON public.judge_applications(user_id);
CREATE INDEX idx_judge_applications_status ON public.judge_applications(status);

-- ============================================
-- USER BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL CHECK (badge_type IN (
        'ceo',
        'judge',
        'auditioner',
        'performer',
        'winner',
        'top_performer',
        'moderator',
        'vip'
    )),
    awarded_by UUID REFERENCES public.users(id),
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_permanent BOOLEAN DEFAULT true,
    UNIQUE(user_id, badge_type)
);

-- Create indexes
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_type ON public.user_badges(badge_type);

-- ============================================
-- JUDGE DECISIONS TABLE (Yes/No voting for performances)
-- ============================================
CREATE TABLE IF NOT EXISTS public.judge_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judge_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    performance_id UUID REFERENCES public.performances(id) ON DELETE CASCADE,
    decision TEXT CHECK (decision IN ('yes', 'no', 'maybe')) NOT NULL,
    comments TEXT,
    score_bonus INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(judge_id, performance_id)
);

-- Create indexes
CREATE INDEX idx_judge_decisions_judge_id ON public.judge_decisions(judge_id);
CREATE INDEX idx_judge_decisions_performance_id ON public.judge_decisions(performance_id);

-- ============================================
-- PLATFORM SETTINGS TABLE (Admin restrictions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value, description) VALUES
    ('chat_enabled', 'true', 'Enable/disable chat functionality'),
    ('payouts_enabled', 'true', 'Enable/disable payout functionality'),
    ('gifts_enabled', 'true', 'Enable/disable gift sending'),
    ('purchases_enabled', 'true', 'Enable/disable coin purchases'),
    ('new_registrations_enabled', 'true', 'Enable/disable new user registrations');

-- Create index
CREATE INDEX idx_platform_settings_key ON public.platform_settings(key);

-- ============================================
-- RLS POLICIES (Row Level Security)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Users: Everyone can read, only owner can update
CREATE POLICY "Users can be viewed by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can be updated by owner" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Shows: Everyone can read shows
CREATE POLICY "Shows can be viewed by everyone" ON public.shows FOR SELECT USING (true);
CREATE POLICY "Hosts can insert shows" ON public.shows FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update shows" ON public.shows FOR UPDATE USING (auth.uid() = host_id);

-- Performances: Everyone can read
CREATE POLICY "Performances can be viewed by everyone" ON public.performances FOR SELECT USING (true);

-- Votes: Users can only see their own votes (for checking if voted)
CREATE POLICY "Users can view own votes" ON public.votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert votes" ON public.votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat: Everyone can read, authenticated users can insert
CREATE POLICY "Chat messages can be viewed by everyone" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Purchases: Users can only see own purchases
CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = user_id);

-- Payouts: Users can only see own payouts
CREATE POLICY "Users can view own payouts" ON public.payouts FOR SELECT USING (auth.uid() = user_id);

-- Notifications: Users can only see own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- Judge Applications: Users can view own, Admins can view all
CREATE POLICY "Users can view own judge applications" ON public.judge_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert judge applications" ON public.judge_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage judge applications" ON public.judge_applications FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- User Badges: Everyone can view badges
CREATE POLICY "User badges can be viewed by everyone" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON public.user_badges FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Judge Decisions: Judges can insert, Everyone can view
CREATE POLICY "Judge decisions can be viewed by everyone" ON public.judge_decisions FOR SELECT USING (true);
CREATE POLICY "Approved judges can make decisions" ON public.judge_decisions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = auth.uid() AND badge_type = 'judge')
);

-- ====================================
-- PRIVATE MESSAGES TABLE (Direct Messages)
-- ====================================
CREATE TABLE IF NOT EXISTS public.private_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_paid_message BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_private_messages_sender ON public.private_messages(sender_id);
CREATE INDEX idx_private_messages_receiver ON public.private_messages(receiver_id);

-- Enable RLS
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Private Messages policies
CREATE POLICY "Private messages can be viewed by sender or receiver" ON public.private_messages FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Authenticated users can send messages" ON public.private_messages FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);

-- Platform Settings: Only admins can manage
CREATE POLICY "Platform settings can be viewed by everyone" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Followers: Users can see their own follows, everyone can see follows
CREATE POLICY "Followers can be viewed by everyone" ON public.followers FOR SELECT USING (true);
CREATE POLICY "Users can follow/unfollow" ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.followers FOR DELETE USING (auth.uid() = follower_id);

-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.users 
        SET following = following + 1 
        WHERE id = NEW.follower_id;
        
        UPDATE public.users 
        SET followers = followers + 1 
        WHERE id = NEW.following_id;
        
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.users 
        SET following = following - 1 
        WHERE id = OLD.follower_id;
        
        UPDATE public.users 
        SET followers = followers - 1 
        WHERE id = OLD.following_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for follower count
CREATE TRIGGER trigger_update_follower_count
    AFTER INSERT OR DELETE ON public.followers
    FOR EACH ROW EXECUTE FUNCTION update_follower_count();

-- Function to update performance votes/score
CREATE OR REPLACE FUNCTION update_performance_votes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.performances 
        SET votes = votes + 1,
            score = score + CASE WHEN NEW.vote_type = 'super_vote' THEN 5 ELSE 1 END
        WHERE id = NEW.performance_id;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for performance votes
CREATE TRIGGER trigger_update_performance_votes
    AFTER INSERT ON public.votes
    FOR EACH ROW EXECUTE FUNCTION update_performance_votes();

-- Function to add coins to user balance
CREATE OR REPLACE FUNCTION add_user_coins(user_uuid UUID, coin_amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users 
    SET coin_balance = coin_balance + coin_amount
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct coins from user balance
CREATE OR REPLACE FUNCTION deduct_user_coins(user_uuid UUID, coin_amount INTEGER)
RETURNS BOOLEAN AS $
DECLARE
    current_balance INTEGER;
BEGIN
    SELECT coin_balance INTO current_balance FROM public.users WHERE id = user_uuid;
    
    IF current_balance >= coin_amount THEN
        UPDATE public.users 
        SET coin_balance = coin_balance - coin_amount
        WHERE id = user_uuid;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$ LANGUAGE plpgsql;

-- ============================================
-- AUTOMATIC PROFILE CREATION & CEO ROLE
-- ============================================

-- Function to create user profile automatically after signup
-- This needs to be triggered by Supabase Auth hook
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $
DECLARE
    new_username TEXT;
    is_ceo_account BOOLEAN := false;
BEGIN
    -- Generate username from email if not provided
    new_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1),
        'user_' || LEFT(NEW.id::TEXT, 8)
    );
    
    -- Check if this is the CEO email (server-side only - email is passed from signup)
    -- Note: The actual email check happens in the trigger that calls this function
    -- This function receives the is_ceo flag as a parameter
    
    -- Insert the user profile
    INSERT INTO public.users (
        id,
        username,
        email,
        coin_balance,
        is_admin,
        is_ceo
    )
    VALUES (
        NEW.id,
        new_username,
        NEW.email,
        0,
        false,
        false
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $
DECLARE
    is_ceo_email BOOLEAN := false;
BEGIN
    -- Check if this is the CEO email (server-side check only)
    -- This email should NOT be hardcoded in frontend
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
$ LANGUAGE plpgsql;

-- Enable the trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to check if user has CEO role
CREATE OR REPLACE FUNCTION is_user_ceo(user_uuid UUID)
RETURNS BOOLEAN AS $
DECLARE
    ceo_status BOOLEAN;
BEGIN
    SELECT is_ceo INTO ceo_status
    FROM public.users
    WHERE id = user_uuid;
    
    RETURN COALESCE(ceo_status, false);
END;
$ LANGUAGE plpgsql;

-- Function to check if user has admin role
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid UUID)
RETURNS BOOLEAN AS $
DECLARE
    admin_status BOOLEAN;
BEGIN
    SELECT is_admin INTO admin_status
    FROM public.users
    WHERE id = user_uuid;
    
    RETURN COALESCE(admin_status, false);
END;
$ LANGUAGE plpgsql;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $
DECLARE
    user_role TEXT;
BEGIN
    IF (SELECT is_ceo FROM public.users WHERE id = user_uuid) = true THEN
        RETURN 'ceo';
    ELSIF (SELECT is_admin FROM public.users WHERE id = user_uuid) = true THEN
        RETURN 'admin';
    ELSE
        RETURN 'user';
    END IF;
END;
$ LANGUAGE plpgsql;

-- ============================================
-- CEO PROTECTION (Prevent admin actions on CEO)
-- ============================================

-- Function to check if an action is allowed based on role hierarchy
-- CEO > ADMIN > USER
CREATE OR REPLACE FUNCTION check_role_action(target_user_id UUID, action TEXT)
RETURNS BOOLEAN AS $
DECLARE
    current_user_id UUID;
    current_role TEXT;
    target_is_ceo BOOLEAN;
BEGIN
    -- Get current user from auth
    current_user_id := auth.uid();
    
    -- Get current user's role
    current_role := get_user_role(current_user_id);
    
    -- Get target user's CEO status
    target_is_ceo := COALESCE((SELECT is_ceo FROM public.users WHERE id = target_user_id), false);
    
    -- CEO can do anything
    IF current_role = 'ceo' THEN
        RETURN true;
    END IF;
    
    -- Admins cannot perform actions on CEO
    IF target_is_ceo AND current_role = 'admin' THEN
        RETURN false;
    END IF;
    
    -- Admins can perform admin actions on regular users
    IF current_role = 'admin' AND action IN ('moderate', 'ban', 'remove_content') THEN
        RETURN true;
    END IF;
    
    -- Regular users can only manage their own data
    IF current_role = 'user' AND target_user_id = current_user_id THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$ LANGUAGE plpgsql;

-- ============================================
-- COMPLETE!
-- ============================================
