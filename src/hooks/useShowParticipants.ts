import { useState, useEffect, useCallback } from 'react'
import { supabase, type ShowParticipant, type ShowRole, type ShowQueueItem } from '../lib/supabase'

interface UseShowParticipantsOptions {
  showId: string
}

interface UseShowParticipantsReturn {
  hosts: ShowParticipant[]
  judges: ShowParticipant[]
  performers: ShowParticipant[]
  audience: ShowParticipant[]
  loading: boolean
  error: string | null
  addParticipant: (userId: string, role: ShowRole) => Promise<boolean>
  removeParticipant: (userId: string, role: ShowRole) => Promise<boolean>
  getUserRole: (userId: string) => ShowRole | null
}

export function useShowParticipants({ showId }: UseShowParticipantsOptions): UseShowParticipantsReturn {
  const [participants, setParticipants] = useState<ShowParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchParticipants = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('show_participants')
        .select('*')
        .eq('show_id', showId)
        .eq('is_active', true)

      if (fetchError) throw fetchError
      setParticipants(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch participants')
    } finally {
      setLoading(false)
    }
  }, [showId])

  useEffect(() => {
    if (!showId) return

    fetchParticipants()

    // Subscribe to participant changes
    const channel = supabase
      .channel(`show-participants-${showId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'show_participants',
        filter: `show_id=eq.${showId}`
      }, () => {
        fetchParticipants()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId, fetchParticipants])

  const hosts = participants.filter(p => p.role === 'host')
  const judges = participants.filter(p => p.role === 'judge')
  const performers = participants.filter(p => p.role === 'performer')
  const audience = participants.filter(p => p.role === 'audience')

  const addParticipant = async (userId: string, role: ShowRole): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_participants')
        .insert({
          show_id: showId,
          user_id: userId,
          role,
          is_active: true
        })

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add participant')
      return false
    }
  }

  const removeParticipant = async (userId: string, role: ShowRole): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_participants')
        .update({ is_active: false })
        .eq('show_id', showId)
        .eq('user_id', userId)
        .eq('role', role)

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove participant')
      return false
    }
  }

  const getUserRole = (userId: string): ShowRole | null => {
    const participant = participants.find(p => p.user_id === userId && p.is_active)
    return participant?.role || null
  }

  return {
    hosts,
    judges,
    performers,
    audience,
    loading,
    error,
    addParticipant,
    removeParticipant,
    getUserRole
  }
}

// Hook for checking user's role in a show
export function useUserShowRole(showId: string, userId: string | undefined) {
  const [role, setRole] = useState<ShowRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!showId || !userId) {
      setRole(null)
      setLoading(false)
      return
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('show_participants')
          .select('role')
          .eq('show_id', showId)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single()

        if (error) throw error
        setRole(data?.role || null)
      } catch {
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()

    // Subscribe to role changes
    const channel = supabase
      .channel(`user-role-${showId}-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'show_participants',
        filter: `show_id=eq.${showId}`
      }, () => {
        fetchRole()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId, userId])

  return { role, loading }
}

// Hook for performer queue management
export function useShowQueue(showId: string) {
  const [queue, setQueue] = useState<ShowQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('show_queue')
        .select('*')
        .eq('show_id', showId)
        .order('position', { ascending: true })

      if (fetchError) throw fetchError
      setQueue(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue')
    } finally {
      setLoading(false)
    }
  }, [showId])

  useEffect(() => {
    if (!showId) return

    fetchQueue()

    // Subscribe to queue changes
    const channel = supabase
      .channel(`show-queue-${showId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'show_queue',
        filter: `show_id=eq.${showId}`
      }, () => {
        fetchQueue()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId, fetchQueue])

  const addToQueue = async (userId: string, position: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_queue')
        .insert({
          show_id: showId,
          user_id: userId,
          position,
          status: 'waiting',
          ready_status: 'not_ready'
        })

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to queue')
      return false
    }
  }

  const removeFromQueue = async (queueId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_queue')
        .update({ status: 'removed' })
        .eq('id', queueId)

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from queue')
      return false
    }
  }

  const markReady = async (queueId: string, userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_queue')
        .update({ ready_status: 'ready', ready_at: new Date().toISOString() })
        .eq('id', queueId)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark ready')
      return false
    }
  }

  const confirmOnStage = async (queueId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_queue')
        .update({ 
          status: 'performing', 
          ready_status: 'confirmed',
          confirmed_at: new Date().toISOString() 
        })
        .eq('id', queueId)

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm on stage')
      return false
    }
  }

  const skipPerformer = async (queueId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('show_queue')
        .update({ 
          status: 'skipped',
          skipped_at: new Date().toISOString()
        })
        .eq('id', queueId)

      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip performer')
      return false
    }
  }

  return {
    queue,
    loading,
    error,
    addToQueue,
    removeFromQueue,
    markReady,
    confirmOnStage,
    skipPerformer,
    refreshQueue: fetchQueue
  }
}
