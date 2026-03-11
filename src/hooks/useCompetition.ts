import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type {
  Season,
  SeasonAudition,
  CompetitionRound,
  CompetitionPerformance,
  GiftType,
  HallOfChampion,
  ShowPhase,
  PerformerWithScore,
  SupporterInfo,
  ComboInfo,
  PhaseType
} from '../lib/supabase'

// ============================================
// SEASON HOOKS
// ============================================

export function useCurrentSeason() {
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCurrentSeason = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('status', 'active')
        .single()

      if (error) throw error
      setSeason(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrentSeason()
  }, [fetchCurrentSeason])

  return { season, loading, error, refetch: fetchCurrentSeason }
}

export function useAllSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSeasons = async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false })

      if (!error && data) {
        setSeasons(data)
      }
      setLoading(false)
    }

    fetchSeasons()
  }, [])

  return { seasons, loading }
}

// ============================================
// AUDITION HOOKS
// ============================================

export function useSeasonAuditions(seasonId: string | null) {
  const [auditions, setAuditions] = useState<SeasonAudition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seasonId) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => setLoading(false))
      return () => cancelAnimationFrame(timeoutId)
    }

    const fetchAuditions = async () => {
      const { data, error } = await supabase
        .from('season_auditions')
        .select('*')
        .eq('season_id', seasonId)
        .order('final_score', { ascending: false })

      if (!error && data) {
        setAuditions(data)
      }
      setLoading(false)
    }

    fetchAuditions()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('auditions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'season_auditions',
        filter: `season_id=eq.${seasonId}`
      }, () => {
        fetchAuditions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [seasonId])

  return { auditions, loading }
}

export function useUserAudition(userId: string | null, seasonId: string | null) {
  const [audition, setAudition] = useState<SeasonAudition | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !seasonId) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => setLoading(false))
      return () => cancelAnimationFrame(timeoutId)
    }

    const fetchAudition = async () => {
      const { data, error } = await supabase
        .from('season_auditions')
        .select('*')
        .eq('user_id', userId)
        .eq('season_id', seasonId)
        .single()

      if (!error && data) {
        setAudition(data)
      }
      setLoading(false)
    }

    fetchAudition()
  }, [userId, seasonId])

  return { audition, loading }
}

// ============================================
// COMPETITION ROUNDS HOOKS
// ============================================

export function useCompetitionRounds(seasonId: string | null) {
  const [rounds, setRounds] = useState<CompetitionRound[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seasonId) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => setLoading(false))
      return () => cancelAnimationFrame(timeoutId)
    }

    const fetchRounds = async () => {
      const { data, error } = await supabase
        .from('competition_rounds')
        .select('*')
        .eq('season_id', seasonId)
        .order('round_number', { ascending: true })

      if (!error && data) {
        setRounds(data)
      }
      setLoading(false)
    }

    fetchRounds()
  }, [seasonId])

  return { rounds, loading }
}

export function useCurrentRound(seasonId: string | null) {
  const [round, setRound] = useState<CompetitionRound | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seasonId) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => setLoading(false))
      return () => cancelAnimationFrame(timeoutId)
    }

    const fetchCurrentRound = async () => {
      const { data, error } = await supabase
        .from('competition_rounds')
        .select('*')
        .eq('season_id', seasonId)
        .eq('status', 'active')
        .single()

      if (!error && data) {
        setRound(data)
      }
      setLoading(false)
    }

    fetchCurrentRound()
  }, [seasonId])

  return { round, loading }
}

// ============================================
// COMPETITION PERFORMANCES HOOKS
// ============================================

export function useRoundPerformances(roundId: string | null) {
  const [performances, setPerformances] = useState<CompetitionPerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roundId) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => setLoading(false))
      return () => cancelAnimationFrame(timeoutId)
    }

    const fetchPerformances = async () => {
      const { data, error } = await supabase
        .from('competition_performances')
        .select('*')
        .eq('round_id', roundId)
        .order('final_score', { ascending: false })

      if (!error && data) {
        setPerformances(data)
      }
      setLoading(false)
    }

    fetchPerformances()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('performances_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'competition_performances',
        filter: `round_id=eq.${roundId}`
      }, () => {
        fetchPerformances()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roundId])

  return { performances, loading }
}

// ============================================
// LIVE SHOW HOOKS
// ============================================

export function useLiveShowPerformers(showId: string | null) {
  const [performers, setPerformers] = useState<PerformerWithScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!showId) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => setLoading(false))
      return () => cancelAnimationFrame(timeoutId)
    }

    const fetchPerformers = async () => {
      const { data: performances, error } = await supabase
        .from('competition_performances')
        .select(`
          id,
          performer_id,
          vote_score,
          gift_support,
          final_score,
          status,
          user:users!performer_id(username, avatar)
        `)
        .eq('show_id', showId)
        .order('final_score', { ascending: false })

      if (!error && performances) {
        // Calculate percentages
        const totalScore = performances.reduce((sum, p) => 
          sum + (p.vote_score || 0) + (p.gift_support || 0), 0)
        
        const formattedPerformers = performances.map((p, index) => ({
          id: p.id,
          performer_id: p.performer_id,
          username: (p.user as { username?: string })?.username || 'Unknown',
          avatar: (p.user as { avatar?: string })?.avatar || '',
          vote_score: p.vote_score || 0,
          gift_support: p.gift_support || 0,
          final_score: p.final_score || 0,
          rank: index + 1,
          percentage: totalScore > 0 
            ? Math.round(((p.vote_score || 0) + (p.gift_support || 0)) / totalScore * 100)
            : 0
        }))
        
        setPerformers(formattedPerformers)
      }
      setLoading(false)
    }

    fetchPerformers()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('live_show_performers')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'competition_performances',
        filter: `show_id=eq.${showId}`
      }, () => {
        fetchPerformers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId])

  return { performers, loading }
}

export function useShowPhase(showId: string | null) {
  const [phase, setPhase] = useState<ShowPhase | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!showId) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => setLoading(false))
      return () => cancelAnimationFrame(timeoutId)
    }

    const fetchPhase = async () => {
      const { data, error } = await supabase
        .from('show_phases')
        .select('*')
        .eq('show_id', showId)
        .eq('is_active', true)
        .single()

      if (!error && data) {
        setPhase(data)
      }
      setLoading(false)
    }

    fetchPhase()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('show_phase_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'show_phases',
        filter: `show_id=eq.${showId}`
      }, () => {
        fetchPhase()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId])

  return { phase, loading }
}

// ============================================
// GIFT HOOKS
// ============================================

export function useGiftTypes() {
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGiftTypes = async () => {
      const { data, error } = await supabase
        .from('gift_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (!error && data) {
        setGiftTypes(data)
      }
      setLoading(false)
    }

    fetchGiftTypes()
  }, [])

  return { giftTypes, loading }
}

export function useShowSuppliers(showId: string | null, performerId: string | null) {
  const [supporters, setSupporters] = useState<SupporterInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!showId || !performerId) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => setLoading(false))
      return () => cancelAnimationFrame(timeoutId)
    }

    const fetchSupporters = async () => {
      const { data, error } = await supabase
        .from('gifts_sent')
        .select(`
          sender_id,
          coin_value,
          user:users!sender_id(username, avatar)
        `)
        .eq('show_id', showId)
        .eq('performer_id', performerId)
        .order('coin_value', { ascending: false })
        .limit(10)

      if (!error && data) {
        // Aggregate by user
        const aggregated = data.reduce((acc: Record<string, SupporterInfo>, g) => {
          if (!acc[g.sender_id]) {
            acc[g.sender_id] = {
              user_id: g.sender_id,
              username: (g.user as { username?: string })?.username || 'Unknown',
              avatar: (g.user as { avatar?: string })?.avatar || '',
              total_coins: 0,
              rank: 0
            }
          }
          acc[g.sender_id].total_coins += g.coin_value
          return acc
        }, {})

        const sorted = Object.values(aggregated)
          .sort((a, b) => b.total_coins - a.total_coins)
          .map((s, i) => ({ ...s, rank: i + 1 }))
        
        setSupporters(sorted)
      }
      setLoading(false)
    }

    fetchSupporters()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('supporter_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'gifts_sent',
        filter: `show_id=eq.${showId}`
      }, () => {
        fetchSupporters()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId, performerId])

  return { supporters, loading }
}

// ============================================
// VOTING HOOKS
// ============================================

export function useVote(showId: string | null, performerId: string | null, userId: string | null) {
  const [hasVoted, setHasVoted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!showId || !performerId || !userId) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => setLoading(false))
      return () => cancelAnimationFrame(timeoutId)
    }

    const checkVote = async () => {
      const { data, error } = await supabase
        .from('competition_votes')
        .select('id')
        .eq('show_id', showId)
        .eq('performer_id', performerId)
        .eq('voter_id', userId)
        .single()

      if (!error && data) {
        setHasVoted(true)
      }
      setLoading(false)
    }

    checkVote()
  }, [showId, performerId, userId])

  const castVote = useCallback(async () => {
    if (!showId || !performerId || !userId) return { success: false, error: 'Missing required data' }

    // Get current season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('status', 'active')
      .single()

    const { error } = await supabase
      .from('competition_votes')
      .insert({
        season_id: season?.id,
        performer_id: performerId,
        voter_id: userId,
        round_id: null,
        vote_value: 1,
        is_super_vote: false
      })

    if (error) {
      return { success: false, error: error.message }
    }

    // Get current performance and update
    const { data: perf } = await supabase
      .from('competition_performances')
      .select('vote_score, final_score')
      .eq('show_id', showId)
      .eq('performer_id', performerId)
      .single()

    if (perf) {
      await supabase
        .from('competition_performances')
        .update({ 
          vote_score: (perf.vote_score || 0) + 1,
          final_score: (perf.final_score || 0) + 1
        })
        .eq('show_id', showId)
        .eq('performer_id', performerId)
    }

    return { success: true, error: null }
  }, [showId, performerId, userId])

  return { hasVoted, loading, castVote }
}

// ============================================
// GIFTING HOOKS
// ============================================

export function useSendGift() {
  const [sending, setSending] = useState(false)

  const sendGift = useCallback(async (
    senderId: string,
    performerId: string,
    giftType: GiftType,
    showId: string | null,
    seasonId: string | null,
    roundId: string | null,
    multiplier: 'normal' | 'sudden_death' | 'save' = 'normal'
  ) => {
    setSending(true)

    try {
      // Get sender's coin balance
      const { data: user } = await supabase
        .from('users')
        .select('coin_balance')
        .eq('id', senderId)
        .single()

      if (!user || user.coin_balance < giftType.coin_cost) {
        return { success: false, error: 'Insufficient coins' }
      }

      // Calculate support points with multiplier
      let multiplierValue = 1
      if (multiplier === 'sudden_death') multiplierValue = 2
      if (multiplier === 'save') multiplierValue = 3

      const supportPoints = Math.floor(giftType.coin_cost * giftType.support_weight * multiplierValue)

      // Deduct coins
      await supabase
        .from('users')
        .update({ coin_balance: user.coin_balance - giftType.coin_cost })
        .eq('id', senderId)

      // Record gift
      const { error } = await supabase
        .from('gifts_sent')
        .insert({
          sender_id: senderId,
          performer_id: performerId,
          gift_type_id: giftType.id,
          show_id: showId,
          season_id: seasonId,
          round_id: roundId,
          coin_value: giftType.coin_cost,
          support_points: supportPoints,
          multiplier_type: multiplier
        })

      if (error) {
        // Refund coins on error
        await supabase
          .from('users')
          .update({ coin_balance: user.coin_balance })
          .eq('id', senderId)
        
        return { success: false, error: error.message }
      }

      // Update performance gift support
      const { data: perf } = await supabase
        .from('competition_performances')
        .select('gift_support, final_score')
        .eq('show_id', showId)
        .eq('performer_id', performerId)
        .single()

      if (perf) {
        await supabase
          .from('competition_performances')
          .update({ 
            gift_support: (perf.gift_support || 0) + supportPoints,
            final_score: (perf.final_score || 0) + supportPoints
          })
          .eq('show_id', showId)
          .eq('performer_id', performerId)
      }

      return { success: true, error: null, supportPoints }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    } finally {
      setSending(false)
    }
  }, [])

  return { sendGift, sending }
}

// ============================================
// COMBO HOOKS
// ============================================

export function useCombos(showId: string | null) {
  const [combos, setCombos] = useState<ComboInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!showId) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => setLoading(false))
      return () => cancelAnimationFrame(timeoutId)
    }

    const fetchCombos = async () => {
      const { data, error } = await supabase
        .from('combos')
        .select(`
          id,
          sender_id,
          performer_id,
          gift_count,
          combo_bonus,
          user:users!sender_id(username),
          gift_types!gifts_sent(gift_type_id(name, emoji))
        `)
        .eq('show_id', showId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setCombos(data as unknown as ComboInfo[])
      }
      setLoading(false)
    }

    fetchCombos()

    // Subscribe to new combos
    const channel = supabase
      .channel('combo_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'combos',
        filter: `show_id=eq.${showId}`
      }, () => {
        fetchCombos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId])

  return { combos, loading }
}

// ============================================
// HALL OF CHAMPIONS HOOKS
// ============================================

export function useHallOfChampions() {
  const [champions, setChampions] = useState<HallOfChampion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChampions = async () => {
      const { data, error } = await supabase
        .from('hall_of_champions')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setChampions(data)
      }
      setLoading(false)
    }

    fetchChampions()
  }, [])

  return { champions, loading }
}

// ============================================
// CREATE SEASON HOOK
// ============================================

export function useCreateSeason() {
  const [creating, setCreating] = useState(false)

  const createSeason = useCallback(async (name: string, startDate: string, endDate: string) => {
    setCreating(true)
    
    try {
      const { data, error } = await supabase
        .from('seasons')
        .insert({
          name,
          start_date: startDate,
          end_date: endDate,
          status: 'upcoming'
        })
        .select()
        .single()

      if (error) throw error

      // Create competition rounds for the season
      const rounds = [
        { round_number: 1, round_name: 'Quarter Finals', description: '40 performers compete, top 20 advance', advancing_count: 20 },
        { round_number: 2, round_name: 'Semi Finals', description: '20 performers compete, top 10 advance', advancing_count: 10 },
        { round_number: 3, round_name: 'Finals', description: '10 performers compete, top 4 advance', advancing_count: 4 },
        { round_number: 4, round_name: 'Final Battle', description: 'Top 4 compete for the final 2', advancing_count: 2 },
        { round_number: 5, round_name: 'Final Duel', description: 'Top 2 compete for the championship', advancing_count: 1 }
      ]

      for (const round of rounds) {
        await supabase
          .from('competition_rounds')
          .insert({
            season_id: data.id,
            ...round
          })
      }

      return { success: true, season: data }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    } finally {
      setCreating(false)
    }
  }, [])

  return { createSeason, creating }
}

// ============================================
// AUDITION APPLICATION HOOK
// ============================================

export function useApplyAudition() {
  const [applying, setApplying] = useState(false)

  const applyAudition = useCallback(async (
    userId: string,
    seasonId: string,
    talentCategory: string,
    bio: string,
    videoUrl: string
  ) => {
    setApplying(true)

    try {
      // Check if already applied
      const { data: existing } = await supabase
        .from('season_auditions')
        .select('id')
        .eq('user_id', userId)
        .eq('season_id', seasonId)
        .single()

      if (existing) {
        return { success: false, error: 'You have already applied for this season' }
      }

      const { data, error } = await supabase
        .from('season_auditions')
        .insert({
          user_id: userId,
          season_id: seasonId,
          talent_category: talentCategory,
          bio,
          video_url: videoUrl,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      return { success: true, audition: data }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    } finally {
      setApplying(false)
    }
  }, [])

  return { applyAudition, applying }
}

// ============================================
// SHOW PHASE MANAGEMENT HOOK
// ============================================

export function useShowPhaseManager(showId: string | null) {
  const [loading, setLoading] = useState(false)

  const startPhase = useCallback(async (
    phaseType: PhaseType,
    performerId?: string,
    durationSeconds?: number
  ) => {
    if (!showId) return { success: false, error: 'No show selected' }
    setLoading(true)

    try {
      // End current active phase
      await supabase
        .from('show_phases')
        .update({ is_active: false, end_time: new Date().toISOString() })
        .eq('show_id', showId)
        .eq('is_active', true)

      // Start new phase
      const { data, error } = await supabase
        .from('show_phases')
        .insert({
          show_id: showId,
          phase_type: phaseType,
          performer_id: performerId || null,
          is_active: true,
          duration_seconds: durationSeconds || (phaseType === 'sudden_death' ? 15 : 5)
        })
        .select()
        .single()

      if (error) throw error

      return { success: true, phase: data }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    } finally {
      setLoading(false)
    }
  }, [showId])

  const endPhase = useCallback(async () => {
    if (!showId) return { success: false, error: 'No show selected' }
    setLoading(true)

    try {
      const { error } = await supabase
        .from('show_phases')
        .update({ is_active: false, end_time: new Date().toISOString() })
        .eq('show_id', showId)
        .eq('is_active', true)

      if (error) throw error

      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    } finally {
      setLoading(false)
    }
  }, [showId])

  return { startPhase, endPhase, loading }
}
