import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Database types
export interface User {
  id: string
  username: string
  avatar: string
  bio: string
  talent_category: string
  followers: number
  following: number
  
  coin_balance?: number
  total_earnings?: number
  is_admin?: boolean
  is_ceo?: boolean
  is_verified?: boolean
  is_performer?: boolean
  paypal_email?: string | null
  paypal_verified?: boolean
  
  created_at: string
}

export interface Show {
  id: string
  title: string
  description: string
  thumbnail: string
  start_time: string
  end_time: string | null
  status: 'scheduled' | 'live' | 'completed' | 'ended'
  host_id: string
  viewer_count: number
  created_at: string
  youtube_video_id: string | null
}

export interface Performance {
  id: string
  user_id: string
  show_id: string
  votes: number
  score: number
  status: 'waiting' | 'performing' | 'completed'
  started_at: string | null
  ended_at: string | null
}

export interface Vote {
  id: string
  user_id: string
  performance_id: string
  vote_type: 'vote' | 'super_vote'
  created_at: string
}

export interface Audition {
  id: string
  user_id: string
  talent_category: string
  bio: string
  video_url: string
  availability: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface Gift {
  id: string
  sender_id: string
  receiver_id: string
  gift_type: string
  value: number
  created_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  show_id: string
  message: string
  created_at: string
}

// ============================================
// COMPETITION SYSTEM TYPES
// ============================================

// Seasons
export interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  champion_user_id: string | null
  champion_votes: number
  champion_gift_total: number
  status: 'upcoming' | 'active' | 'completed'
  max_auditions: number
  bonus_coins: number
  created_at: string
}

// Season Auditions
export interface SeasonAudition {
  id: string
  season_id: string
  user_id: string
  talent_category: string
  bio: string | null
  video_url: string | null
  audience_score: number
  judge_score: number
  final_score: number
  rank: number | null
  status: 'pending' | 'live' | 'scored' | 'approved' | 'rejected'
  show_id: string | null
  notes: string | null
  created_at: string
}

// Competition Rounds
export interface CompetitionRound {
  id: string
  season_id: string
  round_number: number
  round_name: string
  description: string | null
  status: 'scheduled' | 'active' | 'completed'
  start_date: string | null
  end_date: string | null
  performers_count: number
  advancing_count: number
  created_at: string
}

// Round types:
// 1 = Quarter Finals (40 -> 20)
// 2 = Semi Finals (20 -> 10)
// 3 = Finals (10 -> 4)
// 4 = Final Battle (4 -> 2)
// 5 = Final Duel (2 -> 1 Champion)

// Competition Performances
export interface CompetitionPerformance {
  id: string
  season_id: string
  round_id: string
  performer_id: string
  performance_order: number | null
  vote_score: number
  gift_support: number
  judge_score: number
  final_score: number
  rank: number | null
  status: 'waiting' | 'performing' | 'scored' | 'eliminated' | 'advanced'
  eliminated_at: string | null
  show_id: string | null
  created_at: string
}

// Competition Votes
export interface CompetitionVote {
  id: string
  season_id: string
  performer_id: string
  voter_id: string
  round_id: string | null
  vote_value: number
  is_super_vote: boolean
  created_at: string
}

// Gift Types
export interface GiftType {
  id: string
  name: string
  emoji: string
  coin_cost: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  support_weight: number
  has_animation: boolean
  animation_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

// Gifts Sent
export interface GiftSent {
  id: string
  sender_id: string
  performer_id: string
  gift_type_id: string | null
  show_id: string | null
  season_id: string | null
  round_id: string | null
  coin_value: number
  support_points: number
  is_combo: boolean
  combo_count: number
  combo_bonus: number
  multiplier_type: 'normal' | 'sudden_death' | 'save'
  created_at: string
}

// Combos
export interface Combo {
  id: string
  sender_id: string
  performer_id: string
  show_id: string | null
  gift_count: number
  combo_bonus: number
  created_at: string
}

// Hall of Champions
export interface HallOfChampion {
  id: string
  season_id: string
  champion_user_id: string
  champion_name: string
  runner_up_user_id: string | null
  runner_up_name: string | null
  second_runner_up_user_id: string | null
  second_runner_up_name: string | null
  total_votes: number
  total_gift_coins: number
  crown_ceremony_date: string | null
  featured_until: string | null
  created_at: string
}

// Show Phases
export interface ShowPhase {
  id: string
  show_id: string
  phase_type: 'performance' | 'sudden_death' | 'audience_save' | 'intermission'
  performer_id: string | null
  start_time: string
  end_time: string | null
  duration_seconds: number
  is_active: boolean
  created_at: string
}

// Elimination History
export interface EliminationHistory {
  id: string
  season_id: string
  round_id: string | null
  performer_id: string
  elimination_rank: number | null
  vote_score: number
  gift_support: number
  final_score: number
  was_saved: boolean
  save_votes: number
  eliminated_at: string
}

// ============================================
// ENUMS
// ============================================

export type RoundType = 'quarter_finals' | 'semi_finals' | 'finals' | 'final_battle' | 'final_duel'

export type PhaseType = 'performance' | 'sudden_death' | 'audience_save' | 'intermission'

export type GiftRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

// ============================================
// UTILITY TYPES
// ============================================

export interface PerformerWithScore {
  id: string
  performer_id: string
  username: string
  avatar: string
  vote_score: number
  gift_support: number
  final_score: number
  rank: number | null
  percentage: number
}

export interface LiveShowState {
  showId: string
  phase: PhaseType
  performers: PerformerWithScore[]
  suddenDeathSeconds: number
  saveCountdown: number
  isActive: boolean
}

export interface SupporterInfo {
  user_id: string
  username: string
  avatar: string
  total_coins: number
  rank: number
}

export interface ComboInfo {
  sender_id: string
  sender_username: string
  performer_id: string
  gift_name: string
  gift_emoji: string
  combo_count: number
  combo_bonus: number
}

// ============================================
// CROWD BOOST TYPES
// ============================================

export interface CrowdBoost {
  id: string
  show_id: string
  performer_id: string
  milestone_amount: number
  boost_multiplier: number
  duration_seconds: number
  started_at: string
  ended_at: string | null
  is_active: boolean
}

export interface CrowdBoostMilestone {
  id: string
  milestone_amount: number
  boost_multiplier: number
  duration_seconds: number
  is_active: boolean
}

// ============================================
// YOUTUBE BROADCAST TYPES
// ============================================

export interface YouTubeBroadcastSettings {
  id: string
  channel_id: string
  stream_key: string
  is_default: boolean
  chat_promo_enabled: boolean
  chat_promo_interval_seconds: number
  chat_promo_message: string
  created_at: string
  updated_at: string
}

export interface YouTubeChatPromo {
  id: string
  show_id: string
  message: string
  sent_at: string
}

// Extended Show interface with YouTube fields
export interface ShowWithYouTube extends Show {
  youtube_broadcast_id: string | null
  youtube_stream_id: string | null
  youtube_stream_key: string | null
  youtube_stream_url: string | null
  youtube_ingestion_type: string | null
  youtube_live_chat_id: string | null
  youtube_visibility: string | null
  youtube_started_at: string | null
  youtube_ended_at: string | null
}

export interface YouTubeBroadcastResult {
  broadcast_id: string
  stream_id: string
  stream_key: string
  stream_url: string
  ingestion_type: string
}

// ============================================
// LIVE SHOW SYSTEM TYPES
// ============================================

// Show Participant Roles
export type ShowRole = 'host' | 'judge' | 'performer' | 'audience';

// Show Participant
export interface ShowParticipant {
  id: string;
  show_id: string;
  user_id: string;
  role: ShowRole;
  joined_at: string;
  is_active: boolean;
}

// Performance Vote Types
export type PerformanceVoteType = 'thumbs_up' | 'heart' | 'star' | 'super_vote' | 'judge_yes' | 'judge_no' | 'judge_maybe';

// Performance Vote
export interface PerformanceVote {
  id: string;
  performance_id: string;
  voter_id: string;
  vote_type: PerformanceVoteType;
  vote_value: number;
  is_sudden_death: boolean;
  created_at: string;
}

// Show Performance (History)
export interface ShowPerformance {
  id: string;
  show_id: string;
  performer_id: string;
  performance_id: string | null;
  audience_score: number;
  judge_score: number;
  total_score: number;
  rank: number | null;
  is_winner: boolean;
  is_sudden_death: boolean;
  sudden_death_votes: number;
  created_at: string;
}

// Show Settings
export interface ShowSettings {
  id: string;
  show_id: string;
  performance_duration: number;
  sudden_death_duration: number;
  max_queue_size: number;
  judge_count: number;
  enable_sudden_death: boolean;
  audience_voting_enabled: boolean;
  judge_voting_enabled: boolean;
  auto_advance_queue: boolean;
  require_performer_ready: boolean;
  ready_timeout_seconds: number;
  created_at: string;
  updated_at: string;
}

// Live Show State Phases (for the live show system)
export type LiveShowPhase = 'pre-show' | 'curtain-open' | 'performing' | 'judging' | 'sudden-death' | 'winner-announcement' | 'ended';

// Show State
export interface ShowState {
  id: string;
  show_id: string;
  phase: LiveShowPhase;
  current_performer_id: string | null;
  current_queue_position: number;
  performance_timer_seconds: number;
  sudden_death_enabled: boolean;
  sudden_death_performer1_id: string | null;
  sudden_death_performer2_id: string | null;
  winner_id: string | null;
  updated_at: string;
}

// Performance Score Cache
export interface PerformanceScoreCache {
  id: string;
  performance_id: string;
  audience_score: number;
  judge_score: number;
  total_score: number;
  sudden_death_audience_score: number;
  sudden_death_judge_score: number;
  sudden_death_total_score: number;
  vote_count: number;
  updated_at: string;
}

// Show Event Types
export type ShowEventType = 
  | 'SHOW_STARTED' 
  | 'SHOW_ENDED'
  | 'PERFORMER_CALLED'
  | 'PERFORMER_READY'
  | 'PERFORMER_SKIPPED'
  | 'PERFORMER_COMPLETED'
  | 'SUDDEN_DEATH_STARTED'
  | 'SUDDEN_DEATH_ENDED'
  | 'WINNER_SELECTED'
  | 'QUEUE_UPDATED'
  | 'SETTINGS_CHANGED';

// Show Event
export interface ShowEvent {
  id: string;
  show_id: string;
  event_type: ShowEventType;
  actor_id: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

// Queue Ready Status
export type ReadyStatus = 'not_ready' | 'ready' | 'confirmed';

// Updated Show Queue
export interface ShowQueueItem {
  id: string;
  show_id: string;
  user_id: string;
  position: number;
  status: 'waiting' | 'ready' | 'performing' | 'completed' | 'skipped' | 'removed';
  ready_status: ReadyStatus;
  ready_at: string | null;
  confirmed_at: string | null;
  skipped_at: string | null;
  performer_application_id: string | null;
  created_at: string;
}

// ============================================
// FOLLOW SYSTEM TYPES
// ============================================

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// ============================================
// BLOCKED USERS TYPES
// ============================================

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
}

// ============================================
// USER REPORTS TYPES
// ============================================

export type ReportType = 'spam' | 'harassment' | 'inappropriate' | 'fake_account' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed';

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  report_type: ReportType;
  description: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

// ============================================
// PERFORMER APPLICATIONS TYPES
// ============================================

export type PerformerApplicationStatus = 'pending' | 'approved' | 'denied' | 'bypassed';

export interface PerformerApplication {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string;
  email: string;
  phone: string | null;
  talent_category: string;
  bio: string | null;
  video_url: string | null;
  availability: string | null;
  paypal_email: string;
  paypal_verified: boolean;
  status: PerformerApplicationStatus;
  denial_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  last_attempt_at: string | null;
  attempts_count: number;
  bypassed_by: string | null;
  bypassed_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
    avatar: string;
  };
}

// ============================================
// INTERNAL NOTIFICATIONS TYPES
// ============================================

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ============================================
// USER NOTIFICATIONS (OneSignal) TYPES
// ============================================

export interface UserNotification {
  id: string;
  user_id: string;
  onesignal_player_id: string | null;
  device_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
