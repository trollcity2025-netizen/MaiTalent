import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Mux configuration
const MUX_TOKEN_ID = import.meta.env.VITE_MUX_TOKEN_ID || '2f1ee120-69d2-4876-b483-882fa6468f6c'

export interface MuxStream {
  id: string
  playbackId: string
  status: 'idle' | 'active' | 'disabled'
  new_asset_id: string | null
  created_at: string
}

export interface UseMuxStreamOptions {
  showId: string
}

export interface UseMuxStreamReturn {
  // Stream info
  stream: MuxStream | null
  playbackUrl: string | null
  streamKey: string | null
  
  // Status
  isLive: boolean
  isStarting: boolean
  error: string | null
  
  // Actions
  startStream: () => Promise<void>
  stopStream: () => Promise<void>
  getStreamKey: () => string
}

export function useMuxStream(options: UseMuxStreamOptions): UseMuxStreamReturn {
  const { showId } = options
  
  const [stream, setStream] = useState<MuxStream | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate stream key for the show
  const getStreamKey = useCallback(() => {
    return `show-${showId}`
  }, [showId])

  // Get playback URL from playback ID
  const getPlaybackUrl = (playbackId: string | null): string | null => {
    if (!playbackId) return null
    return `https://stream.mux.com/${playbackId}.m3u8`
  }

  // Start the Mux stream (RTMP push from Agora)
  const startStream = useCallback(async () => {
    setIsStarting(true)
    setError(null)
    
    try {
      // Call Supabase edge function to create Mux live stream
      const response = await fetch('/api/mux-live-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId,
          streamKey: getStreamKey()
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create Mux live stream')
      }
      
      const data = await response.json()
      
      // Save stream info to database
      await supabase.from('shows').update({
        mux_stream_id: data.streamId,
        mux_playback_id: data.playbackId
      }).eq('id', showId)
      
      setStream({
        id: data.streamId,
        playbackId: data.playbackId,
        status: 'active',
        new_asset_id: null,
        created_at: new Date().toISOString()
      })
      
    } catch (err) {
      console.error('Error starting Mux stream:', err)
      setError(err instanceof Error ? err.message : 'Failed to start stream')
    } finally {
      setIsStarting(false)
    }
  }, [showId, getStreamKey])

  // Stop the Mux stream
  const stopStream = useCallback(async () => {
    try {
      // Call Supabase edge function to end Mux live stream
      const response = await fetch('/api/mux-live-stream', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to stop Mux live stream')
      }
      
      // Update database
      await supabase.from('shows').update({
        mux_stream_id: null,
        mux_playback_id: null
      }).eq('id', showId)
      
      setStream(null)
      
    } catch (err) {
      console.error('Error stopping Mux stream:', err)
      setError(err instanceof Error ? err.message : 'Failed to stop stream')
    }
  }, [showId])

  // Load existing stream on mount
  useEffect(() => {
    const loadStream = async () => {
      try {
        const { data: show } = await supabase
          .from('shows')
          .select('mux_stream_id, mux_playback_id')
          .eq('id', showId)
          .single()
        
        if (show && show.mux_playback_id) {
          setStream({
            id: show.mux_stream_id || '',
            playbackId: show.mux_playback_id,
            status: 'active',
            new_asset_id: null,
            created_at: ''
          })
        }
      } catch (err) {
        console.error('Error loading Mux stream:', err)
      }
    }
    
    loadStream()
  }, [showId])

  return {
    stream,
    playbackUrl: stream ? getPlaybackUrl(stream.playbackId) : null,
    streamKey: getStreamKey(),
    isLive: stream?.status === 'active',
    isStarting,
    error,
    startStream,
    stopStream,
    getStreamKey
  }
}
