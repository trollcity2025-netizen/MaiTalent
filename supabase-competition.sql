-- MaiTalent Competition System Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- SEASONS TABLE (Monthly Competition Seasons)
-- ============================================
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    champion_user_id UUID REFERENCES public.users(id),
    status TEXT CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',
    max_auditions INTEGER DEFAULT 150,
    champion_badge_id UUID REFERENCES public.user_badges(id),
    bonus_coins INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_seasons_status ON public.seasons(status);
CREATE INDEX idx_seasons_start_date ON public.seasons(start_date);

-- ============================================
-- SEASON AUDITIONS (Audition Scores & Results)
-- ============================================
CREATE TABLE IF NOT EXISTS public.season_auditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    talent_category TEXT NOT NULL,
    bio TEXT,
    video_url TEXT,
    audience_score INTEGER DEFAULT 0,
    judge_score INTEGER DEFAULT 0,
    final_score DECIMAL(10, 2) DEFAULT 0,
    rank INTEGER,
    status TEXT CHECK (status IN ('pending', 'live', 'scored', 'approved', 'rejected')) DEFAULT 'pending',
    show_id UUID REFERENCES public.shows(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_season_auditions_season_id ON public.season_auditions(season_id);
CREATE INDEX idx_season_auditions_user_id ON public.season_auditions(user_id);
CREATE INDEX idx_season_auditions_final_score ON public.season_auditions(final_score DESC);

-- ============================================
-- COMPETITION ROUNDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.competition_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    round_name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('scheduled', 'active', 'completed')) DEFAULT 'scheduled',
    start_date DATE,
    end_date DATE,
    performers_count INTEGER DEFAULT 0,
    advancing_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Round types
-- 1 = Quarter Finals (40 -> 20)
-- 2 = Semi Finals (20 -> 10)
-- 3 = Finals (10 -> 4)
-- 4 = Final Battle (4 -> 2)
-- 5 = Final Duel (2 -> 1 Champion)

CREATE INDEX idx_competition_rounds_season_id ON public.competition_rounds(season_id);
CREATE INDEX idx_competition_rounds_status ON public.competition_rounds(status);

-- ============================================
-- COMPETITION PERFORMANCES (Round Performances)
-- ============================================
CREATE TABLE IF NOT EXISTS public.competition_performances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    round_id UUID REFERENCES public.competition_rounds(id) ON DELETE CASCADE,
    performer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    performance_order INTEGER,
    vote_score INTEGER DEFAULT 0,
    gift_support INTEGER DEFAULT 0,
    judge_score INTEGER DEFAULT 0,
    final_score DECIMAL(10, 2) DEFAULT 0,
    rank INTEGER,
    status TEXT CHECK (status IN ('waiting', 'performing', 'scored', 'eliminated', 'advanced')) DEFAULT 'waiting',
    eliminated_at TIMESTAMPTZ,
    show_id UUID REFERENCES public.shows(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competition_performances_round_id ON public.competition_performances(round_id);
CREATE INDEX idx_competition_performances_performer_id ON public.competition_performances(performer_id);
CREATE INDEX idx_competition_performances_final_score ON public.competition_performances(final_score DESC);

-- ============================================
-- COMPETITION VOTES (Real-time Votes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.competition_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    performer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    voter_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    round_id UUID REFERENCES public.competition_rounds(id),
    vote_value INTEGER DEFAULT 1,
    is_super_vote BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competition_votes_performer_id ON public.competition_votes(performer_id);
CREATE INDEX idx_competition_votes_voter_id ON public.competition_votes(voter_id);
CREATE UNIQUE INDEX idx_competition_votes_unique ON public.competition_votes(voter_id, performer_id, round_id);

-- ============================================
-- GIFT TYPES TABLE (Virtual Gift Catalog)
-- ============================================
CREATE TABLE IF NOT EXISTS public.gift_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    coin_cost INTEGER NOT NULL,
    rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')) DEFAULT 'common',
    support_weight DECIMAL(5, 2) DEFAULT 0.02,
    has_animation BOOLEAN DEFAULT false,
    animation_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default gift types
INSERT INTO public.gift_types (name, emoji, coin_cost, rarity, support_weight, has_animation, sort_order) VALUES
    ('Roses', '🌹', 10, 'common', 0.02, false, 1),
    ('Hearts', '❤️', 15, 'common', 0.02, false, 2),
    ('Thumbs Up', '👍', 20, 'common', 0.02, false, 3),
    ('Star', '⭐', 50, 'uncommon', 0.03, false, 4),
    ('Fire', '🔥', 75, 'uncommon', 0.03, false, 5),
    ('Diamond', '💎', 100, 'rare', 0.04, true, 6),
    ('Crown', '👑', 200, 'rare', 0.05, true, 7),
    ('Trophy', '🏆', 500, 'epic', 0.06, true, 8),
    ('Rocket', '🚀', 1000, 'epic', 0.07, true, 9),
    ('Lightning', '⚡', 2000, 'legendary', 0.08, true, 10),
    ('Golden Crown', '👸', 5000, 'legendary', 0.10, true, 11),
    ('Dragon', '🐉', 10000, 'legendary', 0.15, true, 12);

-- ============================================
-- GIFTS SENT TABLE (Gift Transactions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.gifts_sent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    performer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    gift_type_id UUID REFERENCES public.gift_types(id) ON DELETE SET NULL,
    show_id UUID REFERENCES public.shows(id),
    season_id UUID REFERENCES public.seasons(id),
    round_id UUID REFERENCES public.competition_rounds(id),
    coin_value INTEGER NOT NULL,
    support_points INTEGER DEFAULT 0,
    is_combo BOOLEAN DEFAULT false,
    combo_count INTEGER DEFAULT 1,
    combo_bonus INTEGER DEFAULT 0,
    multiplier_type TEXT CHECK (multiplier_type IN ('normal', 'sudden_death', 'save')) DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gifts_sent_sender_id ON public.gifts_sent(sender_id);
CREATE INDEX idx_gifts_sent_performer_id ON public.gifts_sent(performer_id);
CREATE INDEX idx_gifts_sent_show_id ON public.gifts_sent(show_id);

-- ============================================
-- COMBOS TABLE (Track Gift Combos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.combos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    performer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    show_id UUID REFERENCES public.shows(id),
    gift_count INTEGER DEFAULT 0,
    combo_bonus INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_combos_performer_id ON public.combos(performer_id);
CREATE INDEX idx_combos_show_id ON public.combos(show_id);

-- ============================================
-- HALL OF CHAMPIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.hall_of_champions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    champion_user_id UUID REFERENCES public.users(id) NOT NULL,
    champion_name TEXT NOT NULL,
    runner_up_user_id UUID REFERENCES public.users(id),
    runner_up_name TEXT,
    second_runner_up_user_id UUID REFERENCES public.users(id),
    second_runner_up_name TEXT,
    total_votes INTEGER DEFAULT 0,
    total_gift_coins INTEGER DEFAULT 0,
    crown_ceremony_date DATE,
    featured_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hall_of_champions_champion_user_id ON public.hall_of_champions(champion_user_id);
CREATE INDEX idx_hall_of_champions_season_id ON public.hall_of_champions(season_id);

-- ============================================
-- SHOW PHASES TABLE (Track Live Show Phases)
-- ============================================
CREATE TABLE IF NOT EXISTS public.show_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
    phase_type TEXT CHECK (phase_type IN ('performance', 'sudden_death', 'audience_save', 'intermission')) DEFAULT 'performance',
    performer_id UUID REFERENCES public.users(id),
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_show_phases_show_id ON public.show_phases(show_id);
CREATE INDEX idx_show_phases_is_active ON public.show_phases(is_active);

-- ============================================
-- ELIMINATION HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.elimination_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    round_id UUID REFERENCES public.competition_rounds(id),
    performer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    elimination_rank INTEGER,
    vote_score INTEGER DEFAULT 0,
    gift_support INTEGER DEFAULT 0,
    final_score DECIMAL(10, 2) DEFAULT 0,
    was_saved BOOLEAN DEFAULT false,
    save_votes INTEGER DEFAULT 0,
    eliminated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_elimination_history_season_id ON public.elimination_history(season_id);
CREATE INDEX idx_elimination_history_performer_id ON public.elimination_history(performer_id);

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================

-- Seasons
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seasons can be viewed by everyone" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Admins can manage seasons" ON public.seasons FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Season Auditions
ALTER TABLE public.season_auditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Season auditions can be viewed by everyone" ON public.season_auditions FOR SELECT USING (true);
CREATE POLICY "Performers can create auditions" ON public.season_auditions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage season auditions" ON public.season_auditions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Competition Rounds
ALTER TABLE public.competition_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Competition rounds can be viewed by everyone" ON public.competition_rounds FOR SELECT USING (true);
CREATE POLICY "Admins can manage competition rounds" ON public.competition_rounds FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Competition Performances
ALTER TABLE public.competition_performances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Competition performances can be viewed by everyone" ON public.competition_performances FOR SELECT USING (true);
CREATE POLICY "Admins can manage competition performances" ON public.competition_performances FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Competition Votes
ALTER TABLE public.competition_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Competition votes can be viewed by everyone" ON public.competition_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote in competitions" ON public.competition_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- Gift Types
ALTER TABLE public.gift_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gift types can be viewed by everyone" ON public.gift_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage gift types" ON public.gift_types FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Gifts Sent
ALTER TABLE public.gifts_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gifts sent can be viewed by everyone" ON public.gifts_sent FOR SELECT USING (true);
CREATE POLICY "Users can send gifts" ON public.gifts_sent FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Combos
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Combos can be viewed by everyone" ON public.combos FOR SELECT USING (true);

-- Hall of Champions
ALTER TABLE public.hall_of_champions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hall of champions can be viewed by everyone" ON public.hall_of_champions FOR SELECT USING (true);
CREATE POLICY "Admins can manage hall of champions" ON public.hall_of_champions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Show Phases
ALTER TABLE public.show_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Show phases can be viewed by everyone" ON public.show_phases FOR SELECT USING (true);
CREATE POLICY "Admins can manage show phases" ON public.show_phases FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Elimination History
ALTER TABLE public.elimination_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Elimination history can be viewed by everyone" ON public.elimination_history FOR SELECT USING (true);
CREATE POLICY "Admins can manage elimination history" ON public.elimination_history FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================
-- DATABASE FUNCTIONS FOR COMPETITION
-- ============================================

-- Function to calculate final score
CREATE OR REPLACE FUNCTION calculate_final_score(
    p_audience_score INTEGER,
    p_judge_score INTEGER
)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
    RETURN (p_audience_score * 0.7) + (p_judge_score * 0.3);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate gift support points
CREATE OR REPLACE FUNCTION calculate_gift_support(
    p_coin_value INTEGER,
    p_support_weight DECIMAL(5, 2),
    p_multiplier INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
BEGIN
    RETURN FLOOR(p_coin_value * p_support_weight * p_multiplier);
END;
$$ LANGUAGE plpgsql;

-- Function to create new season automatically
CREATE OR REPLACE FUNCTION create_new_season()
RETURNS VOID AS $$
DECLARE
    new_season_name TEXT;
    current_month TEXT;
    current_year TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Get current month and year
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    current_month := TO_CHAR(NOW(), 'Month');
    new_season_name := TRIM(current_month) || ' ' || current_year;
    
    -- Calculate start and end dates
    start_date := DATE_TRUNC('month', NOW());
    end_date := DATE_TRUNC('month', NOW() + INTERVAL '1 month') - INTERVAL '1 day';
    
    -- Insert new season
    INSERT INTO public.seasons (name, start_date, end_date, status)
    VALUES (new_season_name, start_date, end_date, 'active')
    ON CONFLICT DO NOTHING;
    
    -- Update previous season to completed
    UPDATE public.seasons 
    SET status = 'completed'
    WHERE status = 'active' AND end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to advance performer to next round
CREATE OR REPLACE FUNCTION advance_performer(
    p_performance_id UUID,
    p_next_round_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.competition_performances
    SET status = 'advanced',
        round_id = p_next_round_id
    WHERE id = p_performance_id;
END;
$$ LANGUAGE plpgsql;

-- Function to eliminate performer
CREATE OR REPLACE FUNCTION eliminate_performer(
    p_performance_id UUID,
    p_rank INTEGER,
    p_season_id UUID,
    p_round_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_performer_id UUID;
    v_vote_score INTEGER;
    v_gift_support INTEGER;
    v_final_score DECIMAL(10, 2);
BEGIN
    -- Get performer details
    SELECT performer_id, vote_score, gift_support, final_score
    INTO v_performer_id, v_vote_score, v_gift_support, v_final_score
    FROM public.competition_performances
    WHERE id = p_performance_id;
    
    -- Update performance status
    UPDATE public.competition_performances
    SET status = 'eliminated',
        rank = p_rank,
        eliminated_at = NOW()
    WHERE id = p_performance_id;
    
    -- Add to elimination history
    INSERT INTO public.elimination_history (
        season_id,
        round_id,
        performer_id,
        elimination_rank,
        vote_score,
        gift_support,
        final_score
    ) VALUES (
        p_season_id,
        p_round_id,
        v_performer_id,
        p_rank,
        v_vote_score,
        v_gift_support,
        v_final_score
    );
END;
$$ LANGUAGE plpgsql;

-- Function to crown champion
CREATE OR REPLACE FUNCTION crown_champion(
    p_season_id UUID,
    p_champion_user_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_season_name TEXT;
    v_badge_id UUID;
BEGIN
    -- Get season name
    SELECT name INTO v_season_name FROM public.seasons WHERE id = p_season_id;
    
    -- Update season with champion
    UPDATE public.seasons
    SET champion_user_id = p_champion_user_id,
        status = 'completed'
    WHERE id = p_season_id;
    
    -- Award champion badge to user
    INSERT INTO public.user_badges (user_id, badge_type, is_permanent)
    VALUES (p_champion_user_id, 'winner', true)
    ON CONFLICT (user_id, badge_type) DO NOTHING;
    
    -- Get the badge ID
    SELECT id INTO v_badge_id 
    FROM public.user_badges 
    WHERE user_id = p_champion_user_id AND badge_type = 'winner';
    
    -- Add bonus coins to champion
    UPDATE public.users
    SET coin_balance = coin_balance + (SELECT bonus_coins FROM public.seasons WHERE id = p_season_id)
    WHERE id = p_champion_user_id;
    
    -- Add to Hall of Champions
    INSERT INTO public.hall_of_champions (season_id, champion_user_id, champion_name)
    SELECT p_season_id, p_champion_user_id, username
    FROM public.users
    WHERE id = p_champion_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR COMPETITION
-- ============================================

-- Trigger to update audition score when votes/gifts change
CREATE OR REPLACE FUNCTION update_audition_score()
RETURNS TRIGGER AS $$
DECLARE
    v_audience_score INTEGER;
    v_judge_score INTEGER;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Calculate audience score from votes and gifts
        SELECT 
            COALESCE(SUM(cv.vote_value), 0) + COALESCE(SUM(gs.support_points), 0)
        INTO v_audience_score
        FROM public.competition_votes cv
        LEFT JOIN public.gifts_sent gs ON gs.performer_id = NEW.performer_id
        WHERE cv.performer_id = NEW.performer_id;
        
        -- Get judge score
        v_judge_score := NEW.judge_score;
        
        -- Calculate final score
        NEW.final_score := calculate_final_score(v_audience_score, v_judge_score);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for competition performances
CREATE TRIGGER trigger_update_audition_score
    BEFORE INSERT OR UPDATE ON public.competition_performances
    FOR EACH ROW
    EXECUTE FUNCTION update_audition_score();

-- ============================================
-- SCHEDULE AUTOMATIC SEASON CREATION
-- ============================================

-- Create a cron job to create new seasons (requires pg_cron extension)
-- Note: This requires the pg_cron extension to be enabled on Supabase
-- The migration will work without it, but automatic seasons won't run

-- ============================================
-- COMPLETE!
-- ============================================
