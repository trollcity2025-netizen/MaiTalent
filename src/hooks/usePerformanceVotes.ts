import { useState, useEffect, useCallback } from 'react'
import { supabase, type PerformanceVote, type PerformanceVoteType, type PerformanceScoreCache, type ShowState } from '../lib/supabase'

interface UsePerformanceVotesOptions {
  performanceId: string
  userId?: string
}

interface UsePerformanceVotesReturn {
  votes: PerformanceVote[]
  scoreCache: PerformanceScoreCache | null
  userVotes: PerformanceVote[]
  loading: boolean
  error: string | null
  castVote: (voteType: PerformanceVoteType, isSuddenDeath?: boolean) => Promise<boolean>
  hasVoted: boolean
}

export function usePerformanceVotes({ 
  performanceId, 
  userId 
}: UsePerformanceVotesOptions): UsePerformanceVotesReturn {
  const [votes, setVotes] = useState<PerformanceVote[]>([])
  const [scoreCache, setScoreCache] = useState<PerformanceScoreCache | null>(null)
  const [userVotes, setUserVotes] = useState<PerformanceVote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVotes = useCallback(async () => {
    try {
      const { data: votesData, error: votesError } = await supabase
        .from('performance_votes')
        .select('*')
        .eq('performance_id', performanceId)

      if (votesError) throw votesError
      setVotes(votesData || [])

      // Fetch user's votes if userId provided
      if (userId) {
        const { data: userVotesData } = await supabase
          .from('performance_votes')
          .select('*')
          .eq('performance_id', performanceId)
          .eq('voter_id', userId)
        
        setUserVotes(userVotesData || [])
      }

      // Fetch score cache for fast score updates
      const { data: cacheData } = await supabase
        .from('performance_score_cache')
        .select('*')
        .eq('performance_id', performanceId)
        .single()

      setScoreCache(cacheData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch votes')
    } finally {
      setLoading(false)
    }
  }, [performanceId, userId])

  useEffect(() => {
    if (!performanceId) return

    fetchVotes()

    // Subscribe to vote changes
    const channel = supabase
      .channel(`performance-votes-${performanceId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'performance_votes',
        filter: `performance_id=eq.${performanceId}`
      }, () => {
        fetchVotes()
      })
      .subscribe()

    // Subscribe to score cache changes
    const cacheChannel = supabase
      .channel(`performance-score-cache-${performanceId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'performance_score_cache',
        filter: `performance_id=eq.${performanceId}`
      }, (payload) => {
        setScoreCache(payload.new as PerformanceScoreCache)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(cacheChannel)
    }
  }, [performanceId, fetchVotes])

  const castVote = async (
    voteType: PerformanceVoteType, 
    isSuddenDeath: boolean = false
  ): Promise<boolean> => {
    if (!userId) {
      setError('You must be logged in to vote')
      return false
    }

    try {
      // Get vote value based on type
      const voteValue = getVoteValue(voteType)

      const { error: insertError } = await supabase
        .from('performance_votes')
        .insert({
          performance_id: performanceId,
          voter_id: userId,
          vote_type: voteType,
          vote_value: voteValue,
          is_sudden_death: isSuddenDeath
        })

      if (insertError) {
        // If duplicate vote, treat as update
        if (insertError.code === '23505') {
          const { error: updateError } = await supabase
            .from('performance_votes')
            .update({
              vote_type: voteType,
              vote_value: voteValue,
              is_sudden_death: isSuddenDeath
            })
            .eq('performance_id', performanceId)
            .eq('voter_id', userId)

          if (updateError) throw updateError
        } else {
          throw insertError
        }
      }

      await fetchVotes()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cast vote')
      return false
    }
  }

  const hasVoted = userVotes.length > 0

  return {
    votes,
    scoreCache,
    userVotes,
    loading,
    error,
    castVote,
    hasVoted
  }
}

// Helper function to get vote value
function getVoteValue(voteType: PerformanceVoteType): number {
  switch (voteType) {
    case 'super_vote':
      return 5
    case 'star':
      return 3
    case 'heart':
      return 2
    case 'thumbs_up':
      return 1
    case 'judge_yes':
      return 10
    case 'judge_maybe':
      return 5
    case 'judge_no':
      return 0
    default:
      return 1
  }
}

// Hook for show state management
export function useShowState(showId: string) {
  const [showState, setShowState] = useState<{
    phase: string
    currentPerformerId: string | null
    suddenDeathEnabled: boolean
    winnerId: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!showId) return

    const fetchShowState = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('show_states')
          .select('*')
          .eq('show_id', showId)
          .single()

        if (fetchError) throw fetchError
        
        setShowState({
          phase: data.phase,
          currentPerformerId: data.current_performer_id,
          suddenDeathEnabled: data.sudden_death_enabled,
          winnerId: data.winner_id
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch show state')
      } finally {
        setLoading(false)
      }
    }

    fetchShowState()

    // Subscribe to show state changes
    const channel = supabase
      .channel(`show-state-${showId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'show_states',
        filter: `show_id=eq.${showId}`
      }, (payload) => {
        const data = payload.new as ShowState
        setShowState({
          phase: data.phase,
          currentPerformerId: data.current_performer_id,
          suddenDeathEnabled: data.sudden_death_enabled,
          winnerId: data.winner_id
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId])

  const updatePhase = async (phase: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_states')
        .update({ 
          phase, 
          updated_at: new Date().toISOString() 
        })
        .eq('show_id', showId)

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update phase')
      return false
    }
  }

  const setCurrentPerformer = async (performerId: string | null): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_states')
        .update({ 
          current_performer_id: performerId,
          updated_at: new Date().toISOString() 
        })
        .eq('show_id', showId)

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set performer')
      return false
    }
  }

  const triggerSuddenDeath = async (
    performer1Id: string, 
    performer2Id: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_states')
        .update({
          phase: 'sudden-death',
          sudden_death_enabled: true,
          sudden_death_performer1_id: performer1Id,
          sudden_death_performer2_id: performer2Id,
          updated_at: new Date().toISOString()
        })
        .eq('show_id', showId)

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger sudden death')
      return false
    }
  }

  const setWinner = async (winnerId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_states')
        .update({
          phase: 'winner-announcement',
          winner_id: winnerId,
          updated_at: new Date().toISOString()
        })
        .eq('show_id', showId)

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set winner')
      return false
    }
  }

  return {
    showState,
    loading,
    error,
    updatePhase,
    setCurrentPerformer,
    triggerSuddenDeath,
    setWinner
  }
}

// Hook for show settings
export function useShowSettings(showId: string) {
  const [settings, setSettings] = useState<{
    performanceDuration: number
    suddenDeathDuration: number
    maxQueueSize: number
    enableSuddenDeath: boolean
    audienceVotingEnabled: boolean
    judgeVotingEnabled: boolean
    autoAdvanceQueue: boolean
    requirePerformerReady: boolean
    readyTimeoutSeconds: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!showId) return

    const fetchSettings = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('show_settings')
          .select('*')
          .eq('show_id', showId)
          .single()

        if (fetchError) throw fetchError
        
        setSettings({
          performanceDuration: data.performance_duration,
          suddenDeathDuration: data.sudden_death_duration,
          maxQueueSize: data.max_queue_size,
          enableSuddenDeath: data.enable_sudden_death,
          audienceVotingEnabled: data.audience_voting_enabled,
          judgeVotingEnabled: data.judge_voting_enabled,
          autoAdvanceQueue: data.auto_advance_queue,
          requirePerformerReady: data.require_performer_ready,
          readyTimeoutSeconds: data.ready_timeout_seconds
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch settings')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [showId])

  const updateSettings = async (updates: Partial<{
    performance_duration: number
    sudden_death_duration: number
    max_queue_size: number
    enable_sudden_death: boolean
    audience_voting_enabled: boolean
    judge_voting_enabled: boolean
    auto_advance_queue: boolean
    require_performer_ready: boolean
    ready_timeout_seconds: number
  }>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('show_id', showId)

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
      return false
    }
  }

  return {
    settings,
    loading,
    error,
    updateSettings
  }
}
