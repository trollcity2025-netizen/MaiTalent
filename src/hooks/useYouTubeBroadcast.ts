import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { 
  ShowWithYouTube, 
  YouTubeBroadcastSettings, 
  YouTubeChatPromo,
  YouTubeBroadcastResult 
} from '../lib/supabase'

// ============================================
// YOUTUBE SETTINGS HOOK
// ============================================

export function useYouTubeSettings() {
  const [settings, setSettings] = useState<YouTubeBroadcastSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('youtube_broadcast_settings')
        .select('*')
        .eq('is_default', true)
        .single()

      if (error) throw error
      setSettings(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load YouTube settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSettings = useCallback(async (
    channelId: string,
    streamKey: string,
    chatPromoEnabled: boolean = true,
    chatPromoIntervalSeconds: number = 60,
    chatPromoMessage: string = 'Join the interactive show at MaiTalent.fun to vote and send gifts.'
  ) => {
    try {
      const { error } = await supabase.rpc('update_youtube_settings', {
        p_channel_id: channelId,
        p_stream_key: streamKey,
        p_chat_promo_enabled: chatPromoEnabled,
        p_chat_promo_interval_seconds: chatPromoIntervalSeconds,
        p_chat_promo_message: chatPromoMessage
      })

      if (error) throw error
      
      // Refresh settings
      await fetchSettings()
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update settings' }
    }
  }, [fetchSettings])

  return { settings, loading, error, updateSettings, refetch: fetchSettings }
}

// ============================================
// SHOW YOUTUBE BROADCAST HOOK
// ============================================

export function useShowYouTubeBroadcast(showId: string | null) {
  const [show, setShow] = useState<ShowWithYouTube | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchShow = useCallback(async () => {
    if (!showId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('shows')
        .select('*')
        .eq('id', showId)
        .single()

      if (error) throw error
      setShow(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load show')
    } finally {
      setLoading(false)
    }
  }, [showId])

  useEffect(() => {
    fetchShow()
  }, [fetchShow])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!showId) return

    const channel = supabase
      .channel(`show-youtube-${showId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shows',
        filter: `id=eq.${showId}`
      }, (payload) => {
        setShow(payload.new as ShowWithYouTube)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId])

  const startBroadcast = useCallback(async (
    title: string,
    description: string,
    visibility: 'public' | 'unlisted' | 'private' = 'public'
  ) => {
    if (!showId) return { success: false, error: 'No show selected' }

    try {
      const { data, error } = await supabase.rpc('start_youtube_broadcast', {
        p_show_id: showId,
        p_title: title,
        p_description: description,
        p_visibility: visibility
      })

      if (error) throw error

      // Refresh show data
      await fetchShow()

      return { 
        success: true, 
        result: data as YouTubeBroadcastResult 
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to start broadcast' }
    }
  }, [showId, fetchShow])

  const endBroadcast = useCallback(async () => {
    if (!showId) return { success: false, error: 'No show selected' }

    try {
      const { error } = await supabase.rpc('end_youtube_broadcast', {
        p_show_id: showId
      })

      if (error) throw error

      // Refresh show data
      await fetchShow()

      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to end broadcast' }
    }
  }, [showId, fetchShow])

  return { 
    show, 
    loading, 
    error, 
    startBroadcast, 
    endBroadcast, 
    refetch: fetchShow,
    isBroadcasting: show?.status === 'live' && !!show?.youtube_broadcast_id,
    streamUrl: show?.youtube_stream_url || null,
    streamKey: show?.youtube_stream_key || null
  }
}

// ============================================
// YOUTUBE CHAT PROMO HOOK
// ============================================

export function useYouTubeChatPromo(showId: string | null) {
  const [promoSettings, setPromoSettings] = useState<YouTubeBroadcastSettings | null>(null)
  const [lastPromoSent, setLastPromoSent] = useState<Date | null>(null)
  const [sendingPromo, setSendingPromo] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch promo settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('youtube_broadcast_settings')
        .select('*')
        .eq('is_default', true)
        .single()
      
      if (data) {
        setPromoSettings(data)
      }
    }

    fetchSettings()
  }, [])

  // Send promo message
  const sendPromoMessage = useCallback(async () => {
    if (!showId || !promoSettings?.chat_promo_enabled) return

    setSendingPromo(true)
    try {
      // Insert system message to show chat
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase
          .from('chat_messages')
          .insert({
            user_id: user.id,
            show_id: showId,
            message: promoSettings.chat_promo_message,
            is_system_message: true
          })
      }

      // Record the promo
      await supabase
        .from('youtube_chat_promos')
        .insert({
          show_id: showId,
          message: promoSettings.chat_promo_message
        })

      setLastPromoSent(new Date())
    } catch (err) {
      console.error('Failed to send promo message:', err)
    } finally {
      setSendingPromo(false)
    }
  }, [showId, promoSettings])

  // Set up periodic promo messages
  useEffect(() => {
    if (!showId || !promoSettings?.chat_promo_enabled) return

    const intervalMs = (promoSettings.chat_promo_interval_seconds || 60) * 1000

    // Send initial promo
    sendPromoMessage()

    // Set up interval
    intervalRef.current = setInterval(() => {
      sendPromoMessage()
    }, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [showId, promoSettings, sendPromoMessage])

  return {
    promoSettings,
    lastPromoSent,
    sendingPromo,
    sendPromoMessage
  }
}

// ============================================
// ACTIVE YOUTUBE BROADCASTS HOOK (for admin)
// ============================================

export function useActiveYouTubeBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<ShowWithYouTube[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBroadcasts = async () => {
      const { data, error } = await supabase
        .from('shows')
        .select('*')
        .eq('status', 'live')
        .not('youtube_broadcast_id', 'is', null)
        .order('youtube_started_at', { ascending: false })

      if (!error && data) {
        setBroadcasts(data)
      }
      setLoading(false)
    }

    fetchBroadcasts()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('active-youtube-broadcasts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shows',
        filter: "status=eq.live"
      }, () => {
        fetchBroadcasts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { broadcasts, loading }
}

// ============================================
// YOUTUBE STREAM STATUS HOOK
// ============================================

export function useYouTubeStreamStatus(showId: string | null) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'ending' | 'ended'>('idle')
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [streamKey, setStreamKey] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState(0)

  useEffect(() => {
    if (!showId) return

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('shows')
        .select('status, youtube_stream_url, youtube_stream_key, viewer_count')
        .eq('id', showId)
        .single()

      if (data) {
        if (data.status === 'live' && data.youtube_stream_url) {
          setStatus('live')
          setStreamUrl(data.youtube_stream_url)
          setStreamKey(data.youtube_stream_key)
        } else if (data.status === 'ended') {
          setStatus('ended')
        } else {
          setStatus('idle')
        }
        setViewerCount(data.viewer_count || 0)
      }
    }

    fetchStatus()

    // Subscribe to changes
    const channel = supabase
      .channel(`youtube-stream-status-${showId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'shows',
        filter: `id=eq.${showId}`
      }, (payload) => {
        const updated = payload.new as ShowWithYouTube
        if (updated.status === 'live' && updated.youtube_stream_url) {
          setStatus('live')
          setStreamUrl(updated.youtube_stream_url)
          setStreamKey(updated.youtube_stream_key)
        } else if (updated.status === 'ended') {
          setStatus('ended')
        }
        setViewerCount(updated.viewer_count || 0)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId])

  return {
    status,
    streamUrl,
    streamKey,
    viewerCount,
    isLive: status === 'live'
  }
}
