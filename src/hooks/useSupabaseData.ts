import { useState, useEffect } from 'react'
import { supabase, type Show, type User, type Performance, type Season } from '../lib/supabase'

// Fetch live shows
export function useLiveShows() {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const { data, error } = await supabase
          .from('shows')
          .select('*')
          .eq('status', 'live')
          .order('viewer_count', { ascending: false })

        if (error) throw error
        setShows(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch shows')
      } finally {
        setLoading(false)
      }
    }

    fetchShows()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('live-shows')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shows' }, (payload) => {
        const newShow = payload.new as Show
        if (newShow && newShow.status === 'live') {
          setShows(prev => {
            const existing = prev.find(s => s.id === newShow.id)
            if (existing) {
              return prev.map(s => s.id === newShow.id ? newShow : s)
            }
            return [...prev, newShow]
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { shows, loading, error }
}

// Fetch upcoming shows
export function useUpcomingShows() {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const { data, error } = await supabase
          .from('shows')
          .select('*')
          .eq('status', 'scheduled')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(10)

        if (error) throw error
        setShows(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch shows')
      } finally {
        setLoading(false)
      }
    }

    fetchShows()
  }, [])

  return { shows, loading, error }
}

// Fetch featured shows
export function useFeaturedShows() {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const { data, error } = await supabase
          .from('shows')
          .select('*')
          .in('status', ['live', 'scheduled'])
          .order('viewer_count', { ascending: false })
          .limit(8)

        if (error) throw error
        setShows(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch shows')
      } finally {
        setLoading(false)
      }
    }

    fetchShows()
  }, [])

  return { shows, loading, error }
}

// Fetch shows by season
export function useShowsBySeason(seasonId: string | null) {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!seasonId) {
      setLoading(false)
      return
    }

    const fetchShows = async () => {
      try {
        const { data, error } = await supabase
          .from('shows')
          .select('*')
          .eq('season_id', seasonId)
          .order('start_time', { ascending: false })

        if (error) throw error
        setShows(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch shows')
      } finally {
        setLoading(false)
      }
    }

    fetchShows()
  }, [seasonId])

  return { shows, loading, error }
}

// Fetch all seasons
export function useAllSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const { data, error } = await supabase
          .from('seasons')
          .select('*')
          .order('start_date', { ascending: true })

        if (error) throw error
        setSeasons(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch seasons')
      } finally {
        setLoading(false)
      }
    }

    fetchSeasons()
  }, [])

  return { seasons, loading, error }
}

// Fetch trending performers (users with most followers/engagement)
export function useTrendingPerformers() {
  const [performers, setPerformers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPerformers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('is_performer', true)
          .neq('is_admin', true)
          .neq('is_ceo', true)
          .order('followers', { ascending: false })
          .limit(10)

        if (error) throw error
        setPerformers(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch performers')
      } finally {
        setLoading(false)
      }
    }

    fetchPerformers()
  }, [])

  return { performers, loading, error }
}

// Fetch leaderboard
export function useLeaderboard(timeFilter: 'today' | 'week' | 'month' | 'all' = 'week') {
  const [performers, setPerformers] = useState<(User & { total_votes: number; total_score: number })[]>([])
  const [loading, setLoading] = useState(true)

  // Mock data for demo purposes when Supabase is not configured
  const mockPerformers: (User & { total_votes: number; total_score: number })[] = [
    {
      id: '1',
      username: 'StarPerformer',
      avatar: 'https://i.pravatar.cc/150?u=1',
      bio: 'Singing sensation',
      talent_category: 'Vocals',
      followers: 12500,
      following: 230,
      created_at: '2024-01-15',
      total_votes: 15420,
      total_score: 15420
    },
    {
      id: '2',
      username: 'DanceQueen',
      avatar: 'https://i.pravatar.cc/150?u=2',
      bio: 'Contemporary dance artist',
      talent_category: 'Dance',
      followers: 8900,
      following: 150,
      created_at: '2024-02-20',
      total_votes: 12300,
      total_score: 12300
    },
    {
      id: '3',
      username: 'MagicMike',
      avatar: 'https://i.pravatar.cc/150?u=3',
      bio: 'Illusionist and magician',
      talent_category: 'Magic',
      followers: 6700,
      following: 89,
      created_at: '2024-03-10',
      total_votes: 9800,
      total_score: 9800
    },
    {
      id: '4',
      username: 'ComedyKing',
      avatar: 'https://i.pravatar.cc/150?u=4',
      bio: 'Stand-up comedian',
      talent_category: 'Comedy',
      followers: 5200,
      following: 120,
      created_at: '2024-04-05',
      total_votes: 7500,
      total_score: 7500
    },
    {
      id: '5',
      username: 'GuitarHero',
      avatar: 'https://i.pravatar.cc/150?u=5',
      bio: 'Rock guitarist',
      talent_category: 'Instrumental',
      followers: 4800,
      following: 200,
      created_at: '2024-05-12',
      total_votes: 6200,
      total_score: 6200
    },
    {
      id: '6',
      username: 'AcroBella',
      avatar: 'https://i.pravatar.cc/150?u=6',
      bio: 'Acrobatic performer',
      talent_category: 'Acrobatics',
      followers: 3900,
      following: 75,
      created_at: '2024-06-18',
      total_votes: 5100,
      total_score: 5100
    },
    {
      id: '7',
      username: 'JazzHands',
      avatar: 'https://i.pravatar.cc/150?u=7',
      bio: 'Musical theater star',
      talent_category: 'Musical Theater',
      followers: 3100,
      following: 180,
      created_at: '2024-07-22',
      total_votes: 4500,
      total_score: 4500
    },
    {
      id: '8',
      username: 'BeatMaster',
      avatar: 'https://i.pravatar.cc/150?u=8',
      bio: 'Beatboxer and percussionist',
      talent_category: 'Beatbox',
      followers: 2800,
      following: 95,
      created_at: '2024-08-30',
      total_votes: 3800,
      total_score: 3800
    }
  ]

  // Check if Supabase is properly configured
  const isSupabaseConfigured = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    return supabaseUrl && supabaseAnonKey && 
           !supabaseUrl.includes('your-project') && 
           !supabaseAnonKey.includes('your-anon-key')
  }

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // Use mock data if Supabase is not configured
      if (!isSupabaseConfigured()) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500))
        setPerformers(mockPerformers)
        setLoading(false)
        return
      }

      try {
        // Get performances with votes
        let query = supabase
          .from('performances')
          .select(`
            user_id,
            votes,
            score,
            created_at
          `)

        // Apply time filter
        if (timeFilter === 'today') {
          query = query.gte('created_at', new Date().toISOString().split('T')[0])
        } else if (timeFilter === 'week') {
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          query = query.gte('created_at', weekAgo.toISOString())
        } else if (timeFilter === 'month') {
          const monthAgo = new Date()
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          query = query.gte('created_at', monthAgo.toISOString())
        }

        const { data: performances, error: perfError } = await query

        if (perfError) throw perfError

        // Aggregate votes by user
        const votesByUser: Record<string, { votes: number; score: number }> = {}
        performances?.forEach(p => {
          if (!votesByUser[p.user_id]) {
            votesByUser[p.user_id] = { votes: 0, score: 0 }
          }
          votesByUser[p.user_id].votes += p.votes || 0
          votesByUser[p.user_id].score += p.score || 0
        })

        // Get user details
        const userIds = Object.keys(votesByUser)
        if (userIds.length === 0) {
          setPerformers([])
          setLoading(false)
          return
        }

        const { data: users, error: userError } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds)

        if (userError) throw userError

        // Combine and sort
        const leaderboard = (users || []).map(user => ({
          ...user,
          total_votes: votesByUser[user.id]?.votes || 0,
          total_score: votesByUser[user.id]?.score || 0,
        })).sort((a, b) => b.total_score - a.total_score)

        setPerformers(leaderboard)
      } catch {
        // Fallback to mock data on error
        setPerformers(mockPerformers)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()

    // Subscribe to realtime vote updates (only if Supabase is configured)
    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel('leaderboard')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'performances' }, () => {
          // Refresh leaderboard on vote updates
          fetchLeaderboard()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter])

  return { performers, loading, error: null }
}

// Fetch show details
export function useShow(id: string) {
  const [show, setShow] = useState<Show | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShow = async () => {
      try {
        const { data, error } = await supabase
          .from('shows')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        setShow(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch show')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchShow()
  }, [id])

  return { show, loading, error }
}

// Fetch current performance in a show
export function useCurrentPerformance(showId: string) {
  const [performance, setPerformance] = useState<Performance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const { data, error } = await supabase
          .from('performances')
          .select('*')
          .eq('show_id', showId)
          .eq('status', 'performing')
          .single()

        if (error) throw error
        setPerformance(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch performance')
      } finally {
        setLoading(false)
      }
    }

    if (showId) fetchPerformance()

    // Subscribe to performance status changes
    const channel = supabase
      .channel('current-performance')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'performances',
        filter: `show_id=eq.${showId}`
      }, (payload) => {
        const newPerf = payload.new as Performance
        if (newPerf && newPerf.status === 'performing') {
          setPerformance(newPerf)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId])

  return { performance, loading, error }
}

// Fetch performer profile
export function usePerformer(userId: string) {
  const [performer, setPerformer] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPerformer = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error
        setPerformer(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch performer')
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchPerformer()
  }, [userId])

  return { performer, loading, error }
}

// Submit audition
export function useSubmitAudition() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (data: {
    talent_category: string
    bio: string
    video_url: string
    availability: string
  }) => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('You must be logged in to submit an audition')

      const { error: insertError } = await supabase
        .from('auditions')
        .insert({
          user_id: user.id,
          talent_category: data.talent_category,
          bio: data.bio,
          video_url: data.video_url,
          availability: data.availability,
          status: 'pending',
        })

      if (insertError) throw insertError
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit audition')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { submit, loading, error }
}

// Vote for a performer
export function useVote(performanceId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)

  const vote = async (voteType: 'vote' | 'super_vote' = 'vote') => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('You must be logged in to vote')

      // Check if already voted
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('user_id', user.id)
        .eq('performance_id', performanceId)
        .single()

      if (existingVote) {
        setHasVoted(true)
        throw new Error('You have already voted for this performance')
      }

      // Insert vote
      const { error: insertError } = await supabase
        .from('votes')
        .insert({
          user_id: user.id,
          performance_id: performanceId,
          vote_type: voteType,
        })

      if (insertError) throw insertError

      // Update performance vote count - use RPC or direct update
      const { data: currentPerf } = await supabase
        .from('performances')
        .select('votes')
        .eq('id', performanceId)
        .single()

      const newVotes = (currentPerf?.votes || 0) + (voteType === 'super_vote' ? 5 : 1)

      const { error: updateError } = await supabase
        .from('performances')
        .update({ votes: newVotes })
        .eq('id', performanceId)

      if (updateError) throw updateError

      setHasVoted(true)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { vote, loading, error, hasVoted }
}
