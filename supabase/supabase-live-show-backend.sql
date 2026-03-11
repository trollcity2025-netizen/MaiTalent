-- ============================================
-- MAI TALENT LIVE SHOW SYSTEM - BACKEND EXTENSION
-- Complete migration for live show system with role management, voting, scoring, and event logging
-- Run this in your Supabase SQL Editor after the existing schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. SHOW PARTICIPANTS TABLE (Role System)
-- Purpose: Track roles for users in a show (host, judge, performer, audience)
-- ============================================
CREATE TABLE IF NOT EXISTS public.show_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('host', 'judge', 'performer', 'audience')) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(show_id, user_id, role)
);

-- Create indexes
CREATE INDEX idx_show_participants_show_id ON public.show_participants(show_id);
CREATE INDEX idx_show_participants_user_id ON public.show_participants(user_id);
CREATE INDEX idx_show_participants_role ON public.show_participants(role);

-- ============================================
-- 2. PERFORMANCE VOTES TABLE
-- Purpose: Store audience votes and judge votes for performances
-- Note: Multiple votes allowed per user - rate limiting at application level
-- ============================================
CREATE TABLE IF NOT EXISTS public.performance_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    performance_id UUID REFERENCES public.performances(id) ON DELETE CASCADE,
    voter_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    vote_type TEXT CHECK (vote_type IN (
        'thumbs_up', 'heart', 'star', 'super_vote',
        'judge_yes', 'judge_no', 'judge_maybe'
    )) NOT NULL,
    vote_value INTEGER DEFAULT 1,
    is_sudden_death BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_performance_votes_performance_id ON public.performance_votes(performance_id);
CREATE INDEX idx_performance_votes_voter_id ON public.performance_votes(voter_id);
CREATE INDEX idx_performance_votes_is_sudden_death ON public.performance_votes(is_sudden_death);

-- Rate limiting index for high-volume voting
CREATE INDEX idx_performance_votes_rate_limit 
    ON public.performance_votes(voter_id, performance_id, created_at);

-- ============================================
-- 3. SHOW PERFORMANCES TABLE (Performance History)
-- Purpose: Store completed performances and final scores for ranking
-- ============================================
CREATE TABLE IF NOT EXISTS public.show_performances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
    performer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    performance_id UUID REFERENCES public.performances(id) ON DELETE SET NULL,
    audience_score INTEGER DEFAULT 0,
    judge_score INTEGER DEFAULT 0,
    total_score DECIMAL(10, 2) DEFAULT 0,
    rank INTEGER,
    is_winner BOOLEAN DEFAULT false,
    is_sudden_death BOOLEAN DEFAULT false,
    sudden_death_votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(show_id, performer_id)
);

-- Create indexes
CREATE INDEX idx_show_performances_show_id ON public.show_performances(show_id);
CREATE INDEX idx_show_performances_performer_id ON public.show_performances(performer_id);
CREATE INDEX idx_show_performances_rank ON public.show_performances(rank);
CREATE INDEX idx_show_performances_total_score ON public.show_performances(total_score DESC);

-- ============================================
-- 4. SHOW SETTINGS TABLE
-- Purpose: Customizable rules for different show formats
-- ============================================
CREATE TABLE IF NOT EXISTS public.show_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE UNIQUE,
    performance_duration INTEGER DEFAULT 90,
    sudden_death_duration INTEGER DEFAULT 10,
    max_queue_size INTEGER DEFAULT 20,
    judge_count INTEGER DEFAULT 3,
    enable_sudden_death BOOLEAN DEFAULT true,
    audience_voting_enabled BOOLEAN DEFAULT true,
    judge_voting_enabled BOOLEAN DEFAULT true,
    auto_advance_queue BOOLEAN DEFAULT true,
    require_performer_ready BOOLEAN DEFAULT true,
    ready_timeout_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_show_settings_show_id ON public.show_settings(show_id);

-- ============================================
-- 5. SHOW_STATES TABLE (Track Show Phase)
-- ============================================
CREATE TABLE IF NOT EXISTS public.show_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE UNIQUE,
    phase TEXT CHECK (phase IN (
        'pre-show', 'curtain-open', 'performing',
        'judging', 'sudden-death', 'winner-announcement', 'ended'
    )) DEFAULT 'pre-show',
    current_performer_id UUID REFERENCES public.users(id),
    current_queue_position INTEGER DEFAULT 0,
    performance_timer_seconds INTEGER DEFAULT 90,
    sudden_death_enabled BOOLEAN DEFAULT false,
    sudden_death_performer1_id UUID REFERENCES public.users(id),
    sudden_death_performer2_id UUID REFERENCES public.users(id),
    winner_id UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_show_states_show_id ON public.show_states(show_id);

-- ============================================
-- 6. PERFORMANCE SCORE CACHE TABLE
-- Purpose: High-performance score aggregation for real-time UI updates
-- ============================================
CREATE TABLE IF NOT EXISTS public.performance_score_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    performance_id UUID REFERENCES public.performances(id) ON DELETE CASCADE UNIQUE,
    audience_score INTEGER DEFAULT 0,
    judge_score INTEGER DEFAULT 0,
    total_score DECIMAL(10, 2) DEFAULT 0,
    sudden_death_audience_score INTEGER DEFAULT 0,
    sudden_death_judge_score INTEGER DEFAULT 0,
    sudden_death_total_score DECIMAL(10, 2) DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_score_cache_performance_id 
    ON public.performance_score_cache(performance_id);

-- ============================================
-- 7. SHOW EVENTS LOG TABLE
-- Purpose: Track important events during a show for debugging and analytics
-- ============================================
CREATE TABLE IF NOT EXISTS public.show_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor_id UUID REFERENCES public.users(id),
    target_id UUID,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_show_events_show_id ON public.show_events(show_id);
CREATE INDEX idx_show_events_type ON public.show_events(event_type);
CREATE INDEX idx_show_events_created_at ON public.show_events(created_at);

-- ============================================
-- 8. UPDATE EXISTING TABLES
-- ============================================

-- Create show_queue table if it doesn't exist (required for the live show system)
CREATE TABLE IF NOT EXISTS public.show_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    status TEXT CHECK (status IN ('waiting', 'ready', 'performing', 'completed', 'skipped', 'removed')) DEFAULT 'waiting',
    ready_status TEXT CHECK (ready_status IN ('not_ready', 'ready', 'confirmed')) DEFAULT 'not_ready',
    ready_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    skipped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for show_queue
CREATE INDEX IF NOT EXISTS idx_show_queue_show_id ON public.show_queue(show_id);
CREATE INDEX IF NOT EXISTS idx_show_queue_position ON public.show_queue(position);

-- Add queue_position to performances (use PostgreSQL 9.3+ syntax)
ALTER TABLE public.performances ADD COLUMN IF NOT EXISTS queue_position INTEGER;
ALTER TABLE public.performances ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 90;
ALTER TABLE public.performances ADD COLUMN IF NOT EXISTS is_sudden_death BOOLEAN DEFAULT false;

-- Add performance_duration to shows
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS performance_duration INTEGER DEFAULT 90;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS curtain_state TEXT CHECK (curtain_state IN ('closed', 'opening', 'open', 'closing')) DEFAULT 'closed';

-- ============================================
-- 9. DATABASE FUNCTIONS
-- ============================================

-- Calculate audience score from performance_votes
CREATE OR REPLACE FUNCTION calculate_audience_score(p_performance_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER;
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN vote_type = 'super_vote' THEN vote_value * 5
            WHEN vote_type = 'star' THEN vote_value * 3
            WHEN vote_type = 'heart' THEN vote_value * 2
            ELSE vote_value
        END
    ), 0)
    INTO v_score
    FROM public.performance_votes
    WHERE performance_id = p_performance_id
    AND is_sudden_death = false;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Calculate judge score from performance_votes
CREATE OR REPLACE FUNCTION calculate_judge_score(p_performance_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER;
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN vote_type = 'judge_yes' THEN 10
            WHEN vote_type = 'judge_maybe' THEN 5
            ELSE 0
        END
    ), 0)
    INTO v_score
    FROM public.performance_votes
    WHERE performance_id = p_performance_id;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Calculate total score (audience 70% + judge 30%)
CREATE OR REPLACE FUNCTION calculate_total_score(
    p_audience_score INTEGER,
    p_judge_score INTEGER
)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
    RETURN ROUND((p_audience_score * 0.7) + (p_judge_score * 0.3), 2);
END;
$$ LANGUAGE plpgsql;

-- Update performance score cache
CREATE OR REPLACE FUNCTION update_performance_score_cache(p_performance_id UUID)
RETURNS VOID AS $$
DECLARE
    v_audience_score INTEGER;
    v_judge_score INTEGER;
    v_total_score DECIMAL(10, 2);
    v_sudden_death_audience INTEGER;
    v_sudden_death_judge INTEGER;
    v_sudden_death_total DECIMAL(10, 2);
    v_vote_count INTEGER;
BEGIN
    -- Calculate regular scores
    v_audience_score := calculate_audience_score(p_performance_id);
    v_judge_score := calculate_judge_score(p_performance_id);
    v_total_score := calculate_total_score(v_audience_score, v_judge_score);
    
    -- Calculate sudden death scores
    SELECT COALESCE(SUM(vote_value), 0) INTO v_sudden_death_audience
    FROM public.performance_votes
    WHERE performance_id = p_performance_id AND is_sudden_death = true
    AND vote_type IN ('thumbs_up', 'heart', 'star', 'super_vote');
    
    SELECT COALESCE(SUM(CASE WHEN vote_type = 'judge_yes' THEN 10 WHEN vote_type = 'judge_maybe' THEN 5 ELSE 0 END), 0)
    INTO v_sudden_death_judge
    FROM public.performance_votes
    WHERE performance_id = p_performance_id AND is_sudden_death = true;
    
    v_sudden_death_total := calculate_total_score(v_sudden_death_audience, v_sudden_death_judge);
    
    -- Count total votes
    SELECT COUNT(*) INTO v_vote_count
    FROM public.performance_votes
    WHERE performance_id = p_performance_id;
    
    -- Upsert cache
    INSERT INTO public.performance_score_cache (
        performance_id, audience_score, judge_score, total_score,
        sudden_death_audience_score, sudden_death_judge_score, sudden_death_total_score,
        vote_count, updated_at
    ) VALUES (
        p_performance_id, v_audience_score, v_judge_score, v_total_score,
        v_sudden_death_audience, v_sudden_death_judge, v_sudden_death_total,
        v_vote_count, NOW()
    ) ON CONFLICT (performance_id) DO UPDATE SET
        audience_score = v_audience_score,
        judge_score = v_judge_score,
        total_score = v_total_score,
        sudden_death_audience_score = v_sudden_death_audience,
        sudden_death_judge_score = v_sudden_death_judge,
        sudden_death_total_score = v_sudden_death_total,
        vote_count = v_vote_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Update performance ranking after completion
CREATE OR REPLACE FUNCTION update_performance_ranking(p_show_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.show_performances
    SET rank = new_rank
    FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY total_score DESC) as new_rank
        FROM public.show_performances
        WHERE show_id = p_show_id AND is_sudden_death = false
    ) ranked
    WHERE public.show_performances.id = ranked.id;
    
    -- Mark winner
    UPDATE public.show_performances
    SET is_winner = true
    WHERE show_id = p_show_id AND rank = 1;
END;
$$ LANGUAGE plpgsql;

-- Finalize a performance when it ends
CREATE OR REPLACE FUNCTION finalize_performance(
    p_performance_id UUID,
    p_show_id UUID,
    p_performer_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_audience_score INTEGER;
    v_judge_score INTEGER;
    v_total_score DECIMAL(10, 2);
    v_current_rank INTEGER;
BEGIN
    v_audience_score := calculate_audience_score(p_performance_id);
    v_judge_score := calculate_judge_score(p_performance_id);
    v_total_score := calculate_total_score(v_audience_score, v_judge_score);
    
    SELECT COALESCE(MAX(rank), 0) + 1 INTO v_current_rank
    FROM public.show_performances WHERE show_id = p_show_id;
    
    INSERT INTO public.show_performances (
        show_id, performer_id, performance_id,
        audience_score, judge_score, total_score, rank, is_winner
    ) VALUES (
        p_show_id, p_performer_id, p_performance_id,
        v_audience_score, v_judge_score, v_total_score, v_current_rank, false
    ) ON CONFLICT (show_id, performer_id) DO UPDATE SET
        audience_score = v_audience_score,
        judge_score = v_judge_score,
        total_score = v_total_score;
    
    PERFORM update_performance_ranking(p_show_id);
    
    UPDATE public.performances
    SET status = 'completed', ended_at = NOW(), score = v_total_score
    WHERE id = p_performance_id;
    
    -- Log event
    INSERT INTO public.show_events (show_id, event_type, actor_id, target_id)
    VALUES (p_show_id, 'PERFORMER_COMPLETED', NULL, p_performer_id);
END;
$$ LANGUAGE plpgsql;

-- Get tied performers for sudden death
CREATE OR REPLACE FUNCTION get_sudden_death_performers(p_show_id UUID)
RETURNS TABLE(performer_id UUID, total_score DECIMAL(10, 2), rank INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT sp.performer_id, sp.total_score, sp.rank
    FROM public.show_performances sp
    WHERE sp.show_id = p_show_id
    AND sp.is_sudden_death = false
    ORDER BY sp.total_score DESC
    LIMIT 2;
END;
$$ LANGUAGE plpgsql;

-- Trigger sudden death mode (FIXED - no vote modification)
CREATE OR REPLACE FUNCTION trigger_sudden_death(p_show_id UUID)
RETURNS VOID AS $$
DECLARE
    v_perf1_id UUID;
    v_perf2_id UUID;
    v_perf1_uuid UUID;
    v_perf2_uuid UUID;
BEGIN
    -- Get top two performers
    SELECT performer_id, performance_id INTO v_perf1_id, v_perf1_uuid
    FROM public.show_performances
    WHERE show_id = p_show_id
    ORDER BY total_score DESC LIMIT 1;
    
    SELECT performer_id, performance_id INTO v_perf2_id, v_perf2_uuid
    FROM public.show_performances
    WHERE show_id = p_show_id
    ORDER BY total_score DESC LIMIT 1 OFFSET 1;
    
    -- Update show_states for sudden death
    UPDATE public.show_states
    SET sudden_death_enabled = true,
        sudden_death_performer1_id = v_perf1_id,
        sudden_death_performer2_id = v_perf2_id,
        phase = 'sudden-death',
        updated_at = NOW()
    WHERE show_id = p_show_id;
    
    -- Log sudden death event (no vote modification)
    INSERT INTO public.show_events (show_id, event_type, actor_id, target_id, payload)
    VALUES (
        p_show_id, 'SUDDEN_DEATH_STARTED', NULL, v_perf1_id,
        jsonb_build_object('performer1_id', v_perf1_id, 'performer2_id', v_perf2_id)
    );
END;
$$ LANGUAGE plpgsql;

-- Calculate sudden death winner (only counts sudden death votes)
CREATE OR REPLACE FUNCTION calculate_sudden_death_winner(
    p_performance_id1 UUID,
    p_performance_id2 UUID
)
RETURNS UUID AS $$
DECLARE
    v_score1 INTEGER;
    v_score2 INTEGER;
    v_perf1_performer_id UUID;
    v_perf2_performer_id UUID;
BEGIN
    SELECT COALESCE(SUM(vote_value), 0), performer_id
    INTO v_score1, v_perf1_performer_id
    FROM public.performance_votes
    WHERE performance_id = p_performance_id1 AND is_sudden_death = true;
    
    SELECT COALESCE(SUM(vote_value), 0), performer_id
    INTO v_score2, v_perf2_performer_id
    FROM public.performance_votes
    WHERE performance_id = p_performance_id2 AND is_sudden_death = true;
    
    IF v_score1 >= v_score2 THEN
        RETURN v_perf1_performer_id;
    ELSE
        RETURN v_perf2_performer_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add performer to show queue
CREATE OR REPLACE FUNCTION add_to_show_queue(
    p_show_id UUID,
    p_user_id UUID,
    p_position INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
BEGIN
    INSERT INTO public.show_queue (show_id, user_id, position, status)
    VALUES (p_show_id, p_user_id, p_position, 'waiting')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_queue_id;
    
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Mark performer as ready
CREATE OR REPLACE FUNCTION mark_performer_ready(
    p_queue_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.show_queue
    SET ready_status = 'ready', ready_at = NOW()
    WHERE id = p_queue_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Confirm performer on stage
CREATE OR REPLACE FUNCTION confirm_performer_on_stage(p_queue_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.show_queue
    SET status = 'performing', ready_status = 'confirmed', confirmed_at = NOW()
    WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Get next ready performer from queue (WITH LOCKING)
CREATE OR REPLACE FUNCTION get_next_queue_performer(p_show_id UUID)
RETURNS TABLE(queue_id UUID, user_id UUID, username TEXT, avatar TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT q.id, u.id, u.username, u.avatar
    FROM public.show_queue q
    JOIN public.users u ON u.id = q.user_id
    WHERE q.show_id = p_show_id
    AND q.status = 'waiting'
    AND q.ready_status = 'ready'
    ORDER BY q.position ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Skip unready performer (WITH LOCKING)
CREATE OR REPLACE FUNCTION skip_unready_performer(p_show_id UUID)
RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
    v_performer_id UUID;
BEGIN
    SELECT q.id, q.user_id INTO v_queue_id, v_performer_id
    FROM public.show_queue q
    WHERE q.show_id = p_show_id
    AND q.position = 1
    AND q.status = 'waiting'
    AND (q.ready_status = 'not_ready' OR q.ready_status IS NULL)
    AND q.ready_at < NOW() - INTERVAL '30 seconds'
    ORDER BY q.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;
    
    IF v_queue_id IS NOT NULL THEN
        UPDATE public.show_queue
        SET status = 'skipped', skipped_at = NOW()
        WHERE id = v_queue_id;
        
        INSERT INTO public.show_events (show_id, event_type, actor_id, target_id)
        VALUES (p_show_id, 'PERFORMER_SKIPPED', NULL, v_performer_id);
        
        RETURN v_performer_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Get user role in show
CREATE OR REPLACE FUNCTION get_show_role(p_show_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.show_participants
    WHERE show_id = p_show_id AND user_id = p_user_id AND is_active = true
    LIMIT 1;
    
    RETURN COALESCE(v_role, 'audience');
END;
$$ LANGUAGE plpgsql;

-- Check if user can control show (host only)
CREATE OR REPLACE FUNCTION can_control_show(p_show_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_show_role(p_show_id, p_user_id) = 'host';
END;
$$ LANGUAGE plpgsql;

-- Check if user can vote in show
CREATE OR REPLACE FUNCTION can_vote_in_show(p_show_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_show_role(p_show_id, p_user_id) IN ('judge', 'audience');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. AUTO-CREATION TRIGGERS
-- ============================================

-- Create default show settings when show is created
CREATE OR REPLACE FUNCTION create_default_show_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.show_settings (show_id) VALUES (NEW.id)
    ON CONFLICT (show_id) DO NOTHING;
    
    INSERT INTO public.show_states (show_id, phase) VALUES (NEW.id, 'pre-show')
    ON CONFLICT (show_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_show_settings ON public.shows;
CREATE TRIGGER trigger_create_default_show_settings
    AFTER INSERT ON public.shows
    FOR EACH ROW
    EXECUTE FUNCTION create_default_show_settings();

-- Trigger to update score cache when votes are inserted
CREATE OR REPLACE FUNCTION trigger_update_score_cache()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_performance_score_cache(NEW.performance_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_performance_votes_cache ON public.performance_votes;
CREATE TRIGGER trigger_performance_votes_cache
    AFTER INSERT ON public.performance_votes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_score_cache();

-- ============================================
-- 11. ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE public.show_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_score_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_events ENABLE ROW LEVEL SECURITY;

-- Show Participants Policies
DROP POLICY IF EXISTS "Show participants can be viewed by everyone" ON public.show_participants;
CREATE POLICY "Show participants can be viewed by everyone" 
    ON public.show_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can manage their show participants" ON public.show_participants;
CREATE POLICY "Hosts can manage their show participants" 
    ON public.show_participants FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.show_participants sp
            WHERE sp.show_id = public.show_participants.show_id
            AND sp.user_id = auth.uid()
            AND sp.role = 'host'
            AND sp.is_active = true
        )
    );

-- Performance Votes Policies
DROP POLICY IF EXISTS "Performance votes can be viewed by everyone" ON public.performance_votes;
CREATE POLICY "Performance votes can be viewed by everyone" 
    ON public.performance_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.performance_votes;
CREATE POLICY "Authenticated users can vote" 
    ON public.performance_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- Show Performances Policies
DROP POLICY IF EXISTS "Show performances can be viewed by everyone" ON public.show_performances;
CREATE POLICY "Show performances can be viewed by everyone" 
    ON public.show_performances FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can manage their show performances" ON public.show_performances;
CREATE POLICY "Hosts can manage their show performances" 
    ON public.show_performances FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.show_participants sp
            WHERE sp.show_id = public.show_performances.show_id
            AND sp.user_id = auth.uid()
            AND sp.role = 'host'
            AND sp.is_active = true
        )
    );

-- Show Settings Policies
DROP POLICY IF EXISTS "Show settings can be viewed by everyone" ON public.show_settings;
CREATE POLICY "Show settings can be viewed by everyone" 
    ON public.show_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can manage their show settings" ON public.show_settings;
CREATE POLICY "Hosts can manage their show settings" 
    ON public.show_settings FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.show_participants sp
            WHERE sp.show_id = public.show_settings.show_id
            AND sp.user_id = auth.uid()
            AND sp.role = 'host'
            AND sp.is_active = true
        )
    );

-- Show States Policies
DROP POLICY IF EXISTS "Show states can be viewed by everyone" ON public.show_states;
CREATE POLICY "Show states can be viewed by everyone" 
    ON public.show_states FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can manage their show states" ON public.show_states;
CREATE POLICY "Hosts can manage their show states" 
    ON public.show_states FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.show_participants sp
            WHERE sp.show_id = public.show_states.show_id
            AND sp.user_id = auth.uid()
            AND sp.role = 'host'
            AND sp.is_active = true
        )
    );

-- Performance Score Cache Policies
DROP POLICY IF EXISTS "Score cache can be viewed by everyone" ON public.performance_score_cache;
CREATE POLICY "Score cache can be viewed by everyone" 
    ON public.performance_score_cache FOR SELECT USING (true);

-- Show Events Policies
DROP POLICY IF EXISTS "Show events can be viewed by everyone" ON public.show_events;
CREATE POLICY "Show events can be viewed by everyone" 
    ON public.show_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert show events" ON public.show_events;
CREATE POLICY "System can insert show events" 
    ON public.show_events FOR INSERT WITH CHECK (true);

-- Queue Policies
DROP POLICY IF EXISTS "Queue can be viewed by everyone" ON public.show_queue;
CREATE POLICY "Queue can be viewed by everyone" 
    ON public.show_queue FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can manage their show queue" ON public.show_queue;
CREATE POLICY "Hosts can manage their show queue" 
    ON public.show_queue FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.show_participants sp
            WHERE sp.show_id = public.show_queue.show_id
            AND sp.user_id = auth.uid()
            AND sp.role = 'host'
            AND sp.is_active = true
        )
    );

-- ============================================
-- COMPLETE!
-- ============================================
