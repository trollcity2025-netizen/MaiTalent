-- MaiTalent Feature Migrations
-- Run this in your Supabase SQL Editor

-- ============================================
-- ADD PAYPAL EMAIL TO USERS
-- ============================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS paypal_verified BOOLEAN DEFAULT false;

-- Index for paypal email lookup
CREATE INDEX IF NOT EXISTS idx_users_paypal_email ON public.users(paypal_email);

-- ============================================
-- ADD CHAMPION STATS TO SEASONS
-- ============================================
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS champion_votes INTEGER DEFAULT 0;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS champion_gift_total INTEGER DEFAULT 0;

-- ============================================
-- ADD CHAMPION BADGE TYPE
-- ============================================
-- Update user_badges to include champion badge type
-- Note: This requires dropping and recreating the CHECK constraint

-- First, let's add champion to the badge_type check (we need to recreate the table)
ALTER TABLE public.user_badges DROP CONSTRAINT IF EXISTS user_badges_badge_type_check;

ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_badge_type_check 
    CHECK (badge_type IN (
        'ceo',
        'judge',
        'auditioner',
        'performer',
        'winner',
        'top_performer',
        'moderator',
        'vip',
        'champion'
    ));

-- ============================================
-- CROWD BOOST TABLES
-- ============================================

-- Crowd Boost Events Table
CREATE TABLE IF NOT EXISTS public.crowd_boosts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
    performer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    milestone_amount INTEGER NOT NULL,
    boost_multiplier INTEGER DEFAULT 2,
    duration_seconds INTEGER DEFAULT 20,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX idx_crowd_boosts_show_id ON public.crowd_boosts(show_id);
CREATE INDEX idx_crowd_boosts_performer_id ON public.crowd_boosts(performer_id);
CREATE INDEX idx_crowd_boosts_is_active ON public.crowd_boosts(is_active);

-- Enable RLS
ALTER TABLE public.crowd_boosts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Crowd boosts can be viewed by everyone" ON public.crowd_boosts FOR SELECT USING (true);
CREATE POLICY "System can manage crowd boosts" ON public.crowd_boosts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR is_ceo = true))
);

-- ============================================
-- CROWD BOOST MILESTONES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.crowd_boost_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_amount INTEGER NOT NULL UNIQUE,
    boost_multiplier INTEGER DEFAULT 2,
    duration_seconds INTEGER DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default milestones
INSERT INTO public.crowd_boost_milestones (milestone_amount, boost_multiplier, duration_seconds) VALUES
    (500, 2, 15),
    (1000, 2, 20),
    (2500, 3, 20),
    (5000, 3, 25)
ON CONFLICT (milestone_amount) DO NOTHING;

-- Enable RLS
ALTER TABLE public.crowd_boost_milestones ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Milestones can be viewed by everyone" ON public.crowd_boost_milestones FOR SELECT USING (true);
CREATE POLICY "Admins can manage milestones" ON public.crowd_boost_milestones FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR is_ceo = true))
);

-- ============================================
-- ADD CROWD BOOST STATUS TO SHOWS
-- ============================================
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS crowd_boost_active BOOLEAN DEFAULT false;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS current_boost_multiplier INTEGER DEFAULT 1;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS boost_ends_at TIMESTAMPTZ;

-- ============================================
-- ADD CROWD BOOST SUPPORT TO GIFTS_SENT
-- ============================================
ALTER TABLE public.gifts_sent ADD COLUMN IF NOT EXISTS was_boosted BOOLEAN DEFAULT false;
ALTER TABLE public.gifts_sent ADD COLUMN IF NOT EXISTS boost_multiplier INTEGER DEFAULT 1;

-- ============================================
-- DATABASE FUNCTIONS FOR CROWD BOOST
-- ============================================

-- Function to check and activate crowd boost
CREATE OR REPLACE FUNCTION check_crowd_boost(
    p_show_id UUID,
    p_performer_id UUID,
    p_current_gift_total INTEGER
)
RETURNS TABLE (
    boost_activated BOOLEAN,
    boost_multiplier INTEGER,
    duration_seconds INTEGER
) AS $$
DECLARE
    v_boost_activated BOOLEAN := false;
    v_boost_multiplier INTEGER := 1;
    v_duration_seconds INTEGER := 20;
    v_milestone RECORD;
    v_existing_boost RECORD;
BEGIN
    -- Check if there's an active boost
    SELECT * INTO v_existing_boost
    FROM public.crowd_boosts
    WHERE show_id = p_show_id 
        AND performer_id = p_performer_id 
        AND is_active = true
        AND ended_at IS NULL;

    -- Find the next milestone that hasn't been reached
    FOR v_milestone IN 
        SELECT * FROM public.crowd_boost_milestones 
        WHERE is_active = true 
        AND milestone_amount > p_current_gift_total
        ORDER BY milestone_amount ASC
        LIMIT 1
    LOOP
        -- Check if current total meets or exceeds this milestone
        IF p_current_gift_total >= v_milestone.milestone_amount THEN
            -- If there's an existing active boost, extend it
            IF v_existing_boost IS NOT NULL THEN
                -- Reset the timer (don't stack, just extend)
                UPDATE public.crowd_boosts
                SET started_at = NOW(),
                    ended_at = NULL,
                    is_active = true,
                    milestone_amount = v_milestone.milestone_amount
                WHERE id = v_existing_boost.id;
                
                v_boost_activated := true;
                v_boost_multiplier := v_milestone.boost_multiplier;
                v_duration_seconds := v_milestone.duration_seconds;
            ELSE
                -- Create new boost
                INSERT INTO public.crowd_boosts (
                    show_id,
                    performer_id,
                    milestone_amount,
                    boost_multiplier,
                    duration_seconds,
                    is_active
                ) VALUES (
                    p_show_id,
                    p_performer_id,
                    v_milestone.milestone_amount,
                    v_milestone.boost_multiplier,
                    v_milestone.duration_seconds,
                    true
                );
                
                v_boost_activated := true;
                v_boost_multiplier := v_milestone.boost_multiplier;
                v_duration_seconds := v_milestone.duration_seconds;
            END IF;
            
            -- Update show with boost status
            UPDATE public.shows
            SET crowd_boost_active = true,
                current_boost_multiplier = v_boost_multiplier,
                boost_ends_at = NOW() + (v_duration_seconds || ' seconds')::INTERVAL
            WHERE id = p_show_id;
            
            EXIT;
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_boost_activated, v_boost_multiplier, v_duration_seconds;
END;
$$ LANGUAGE plpgsql;

-- Function to end crowd boost
CREATE OR REPLACE FUNCTION end_crowd_boost(p_show_id UUID)
RETURNS VOID AS $$
BEGIN
    -- End all active boosts for the show
    UPDATE public.crowd_boosts
    SET is_active = false,
        ended_at = NOW()
    WHERE show_id = p_show_id AND is_active = true;

    -- Update show status
    UPDATE public.shows
    SET crowd_boost_active = false,
        current_boost_multiplier = 1,
        boost_ends_at = NULL
    WHERE id = p_show_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CROWD BOOST TRIGGER
-- ============================================

-- Trigger function to auto-end boosts after duration
CREATE OR REPLACE FUNCTION check_boost_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if any boosts have expired
    UPDATE public.crowd_boosts
    SET is_active = false,
        ended_at = NOW()
    WHERE is_active = true 
        AND ended_at IS NULL
        AND started_at + (duration_seconds || ' seconds')::INTERVAL < NOW();

    -- Update shows that had expired boosts
    UPDATE public.shows s
    SET crowd_boost_active = false,
        current_boost_multiplier = 1,
        boost_ends_at = NULL
    WHERE s.crowd_boost_active = true
        AND s.boost_ends_at IS NOT NULL
        AND s.boost_ends_at < NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check boost expiration periodically
CREATE TRIGGER trigger_check_boost_expiration
    AFTER INSERT ON public.gifts_sent
    FOR EACH ROW
    EXECUTE FUNCTION check_boost_expiration();

-- ============================================
-- COMPLETE!
-- ============================================

-- ============================================
-- YOUTUBE BROADCAST INTEGRATION
-- ============================================

-- Add YouTube broadcast columns to shows table
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS youtube_broadcast_id TEXT;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS youtube_stream_id TEXT;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS youtube_stream_key TEXT;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS youtube_stream_url TEXT;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS youtube_ingestion_type TEXT DEFAULT 'rtmp';
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS youtube_live_chat_id TEXT;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS youtube_visibility TEXT DEFAULT 'public';
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS youtube_started_at TIMESTAMPTZ;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS youtube_ended_at TIMESTAMPTZ;

-- Create index for YouTube broadcast lookups
CREATE INDEX IF NOT EXISTS idx_shows_youtube_broadcast_id ON public.shows(youtube_broadcast_id);
CREATE INDEX IF NOT EXISTS idx_shows_youtube_stream_id ON public.shows(youtube_stream_id);

-- YouTube Broadcast Settings Table
CREATE TABLE IF NOT EXISTS public.youtube_broadcast_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id TEXT NOT NULL,
    stream_key TEXT,
    is_default BOOLEAN DEFAULT true,
    chat_promo_enabled BOOLEAN DEFAULT true,
    chat_promo_interval_seconds INTEGER DEFAULT 60,
    chat_promo_message TEXT DEFAULT 'Join the interactive show at MaiTalent.fun to vote and send gifts.',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default YouTube broadcast settings
INSERT INTO public.youtube_broadcast_settings (
    channel_id,
    stream_key,
    is_default,
    chat_promo_enabled,
    chat_promo_interval_seconds,
    chat_promo_message
) VALUES (
    '',
    '',
    true,
    true,
    60,
    'Join the interactive show at MaiTalent.fun to vote and send gifts.'
) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.youtube_broadcast_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "YouTube settings can be viewed by everyone" ON public.youtube_broadcast_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage YouTube settings" ON public.youtube_broadcast_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR is_ceo = true))
);

-- ============================================
-- DATABASE FUNCTIONS FOR YOUTUBE BROADCAST
-- ============================================

-- Function to start a YouTube broadcast for a show
CREATE OR REPLACE FUNCTION start_youtube_broadcast(
    p_show_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_visibility TEXT DEFAULT 'public'
)
RETURNS TABLE (
    broadcast_id TEXT,
    stream_id TEXT,
    stream_key TEXT,
    stream_url TEXT,
    ingestion_type TEXT
) AS $
DECLARE
    v_broadcast_id TEXT;
    v_stream_id TEXT;
    v_stream_key TEXT;
    v_stream_url TEXT;
    v_ingestion_type TEXT := 'rtmp';
    v_settings RECORD;
BEGIN
    -- Get YouTube broadcast settings
    SELECT * INTO v_settings FROM public.youtube_broadcast_settings WHERE is_default = true LIMIT 1;
    
    -- In a real implementation, this would call the YouTube Data API
    -- For now, we create placeholder values that would be replaced by the Edge Function
    v_broadcast_id := 'yt_broadcast_' || p_show_id::TEXT;
    v_stream_id := 'yt_stream_' || p_show_id::TEXT;
    v_stream_key := 'sk-' || LEFT(MD5(p_show_id::TEXT), 31);
    v_stream_url := 'rtmp://a.rtmp.youtube.com/live2/' || v_stream_key;
    
    -- Update show with YouTube broadcast info
    UPDATE public.shows
    SET youtube_broadcast_id = v_broadcast_id,
        youtube_stream_id = v_stream_id,
        youtube_stream_key = v_stream_key,
        youtube_stream_url = v_stream_url,
        youtube_ingestion_type = v_ingestion_type,
        youtube_visibility = p_visibility,
        youtube_started_at = NOW(),
        status = 'live'
    WHERE id = p_show_id;
    
    RETURN QUERY SELECT 
        v_broadcast_id,
        v_stream_id,
        v_stream_key,
        v_stream_url,
        v_ingestion_type;
END;
$ LANGUAGE plpgsql;

-- Function to end a YouTube broadcast
CREATE OR REPLACE FUNCTION end_youtube_broadcast(p_show_id UUID)
RETURNS VOID AS $
DECLARE
    v_show RECORD;
BEGIN
    -- Get show info
    SELECT * INTO v_show FROM public.shows WHERE id = p_show_id;
    
    IF v_show IS NULL THEN
        RAISE EXCEPTION 'Show not found';
    END IF;
    
    -- Update show with broadcast end time
    UPDATE public.shows
    SET youtube_ended_at = NOW(),
        status = 'ended',
        end_time = NOW()
    WHERE id = p_show_id;
    
    -- Note: The actual YouTube API call to stop streaming would be done
    -- by an Edge Function that handles the broadcast status change
END;
$ LANGUAGE plpgsql;

-- Function to get YouTube broadcast settings
CREATE OR REPLACE FUNCTION get_youtube_settings()
RETURNS TABLE (
    channel_id TEXT,
    stream_key TEXT,
    chat_promo_enabled BOOLEAN,
    chat_promo_interval_seconds INTEGER,
    chat_promo_message TEXT
) AS $
BEGIN
    RETURN QUERY SELECT 
        ybs.channel_id,
        ybs.stream_key,
        ybs.chat_promo_enabled,
        ybs.chat_promo_interval_seconds,
        ybs.chat_promo_message
    FROM public.youtube_broadcast_settings ybs
    WHERE ybs.is_default = true
    LIMIT 1;
END;
$ LANGUAGE plpgsql;

-- Function to update YouTube settings
CREATE OR REPLACE FUNCTION update_youtube_settings(
    p_channel_id TEXT,
    p_stream_key TEXT,
    p_chat_promo_enabled BOOLEAN DEFAULT true,
    p_chat_promo_interval_seconds INTEGER DEFAULT 60,
    p_chat_promo_message TEXT DEFAULT 'Join the interactive show at MaiTalent.fun to vote and send gifts.'
)
RETURNS VOID AS $
BEGIN
    UPDATE public.youtube_broadcast_settings
    SET channel_id = p_channel_id,
        stream_key = p_stream_key,
        chat_promo_enabled = p_chat_promo_enabled,
        chat_promo_interval_seconds = p_chat_promo_interval_seconds,
        chat_promo_message = p_chat_promo_message,
        updated_at = NOW()
    WHERE is_default = true;
END;
$ LANGUAGE plpgsql;

-- ============================================
-- YOUTUBE CHAT PROMO MESSAGES
-- ============================================

-- Table to track YouTube chat promo messages
CREATE TABLE IF NOT EXISTS public.youtube_chat_promos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_youtube_chat_promos_show_id ON public.youtube_chat_promos(show_id);

-- Enable RLS
ALTER TABLE public.youtube_chat_promos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Chat promos can be viewed by everyone" ON public.youtube_chat_promos FOR SELECT USING (true);
CREATE POLICY "System can insert chat promos" ON public.youtube_chat_promos FOR INSERT WITH CHECK (true);

-- ============================================
-- END YOUTUBE INTEGRATION
-- ============================================
