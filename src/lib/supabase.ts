import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  username: string
  avatar: string
  bio: string
  talent_category: string
  followers: number
  following: number
  created_at: string
}

export interface Show {
  id: string
  title: string
  description: string
  thumbnail: string
  start_time: string
  end_time: string | null
  status: 'scheduled' | 'live' | 'ended'
  host_id: string
  viewer_count: number
  created_at: string
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
