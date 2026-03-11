/**
 * YouTube Live API Service
 * 
 * This service handles the integration with YouTube Data API v3 for creating
 * and managing live broadcasts. It communicates with Supabase Edge Functions
 * which handle the actual YouTube API authentication and requests.
 * 
 * Required YouTube API scopes:
 * - https://www.googleapis.com/auth/youtube
 * - https://www.googleapis.com/auth/youtube.force-ssl
 */

import { supabase } from './supabase'

// YouTube API response types
export interface YouTubeBroadcast {
  id: string
  snippet: {
    title: string
    description: string
    scheduledStartTime: string
    scheduledEndTime?: string
  }
  status: {
    lifeCycleStatus: string
    privacyStatus: string
    recordingStatus: string
  }
}

export interface YouTubeStream {
  id: string
  snippet: {
    title: string
    description: string
  }
  cdn: {
    ingestionInfo: {
      ingestionAddress: string
      streamName: string
    }
    format: string
  }
}

export interface YouTubeStreamResult {
  broadcast_id: string
  stream_id: string
  stream_key: string
  stream_url: string
  ingestion_type: string
  live_chat_id?: string
}

const YOUTUBE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-broadcast`

/**
 * Get a fresh access token using the refresh token
 */
async function getAccessToken(): Promise<string> {
  // This would typically call a Supabase Edge Function to get a fresh token
  // For now, we'll use the stored refresh token approach
  const { data: settings } = await supabase
    .from('youtube_broadcast_settings')
    .select('channel_id, stream_key')
    .eq('is_default', true)
    .single()

  if (!settings?.channel_id) {
    throw new Error('YouTube channel not configured')
  }

  // The actual token refresh would happen in the Edge Function
  return ''
}

/**
 * Create a new YouTube live broadcast
 */
export async function createYouTubeBroadcast(
  title: string,
  description: string,
  scheduledStartTime: Date,
  visibility: 'public' | 'unlisted' | 'private' = 'public'
): Promise<YouTubeStreamResult> {
  try {
    // Call the Supabase Edge Function
    const response = await fetch(YOUTUBE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        action: 'create_broadcast',
        title,
        description,
        scheduledStartTime: scheduledStartTime.toISOString(),
        visibility
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create YouTube broadcast')
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating YouTube broadcast:', error)
    throw error
  }
}

/**
 * Create a YouTube stream (RTMP endpoint)
 */
export async function createYouTubeStream(
  title: string,
  description: string
): Promise<YouTubeStream> {
  try {
    const response = await fetch(YOUTUBE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        action: 'create_stream',
        title,
        description
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create YouTube stream')
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating YouTube stream:', error)
    throw error
  }
}

/**
 * Bind a broadcast to a stream
 */
export async function bindBroadcastToStream(
  broadcastId: string,
  streamId: string
): Promise<void> {
  try {
    const response = await fetch(YOUTUBE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        action: 'bind_broadcast',
        broadcastId,
        streamId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to bind broadcast to stream')
    }
  } catch (error) {
    console.error('Error binding broadcast to stream:', error)
    throw error
  }
}

/**
 * Transition a broadcast to "live" status
 */
export async function transitionBroadcastToLive(
  broadcastId: string
): Promise<void> {
  try {
    const response = await fetch(YOUTUBE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        action: 'transition_broadcast',
        broadcastId,
        status: 'live'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to transition broadcast to live')
    }
  } catch (error) {
    console.error('Error transitioning broadcast to live:', error)
    throw error
  }
}

/**
 * End a YouTube broadcast
 */
export async function endYouTubeBroadcast(
  broadcastId: string
): Promise<void> {
  try {
    const response = await fetch(YOUTUBE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        action: 'end_broadcast',
        broadcastId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to end YouTube broadcast')
    }
  } catch (error) {
    console.error('Error ending YouTube broadcast:', error)
    throw error
  }
}

/**
 * Get broadcast status
 */
export async function getBroadcastStatus(
  broadcastId: string
): Promise<YouTubeBroadcast> {
  try {
    const response = await fetch(YOUTUBE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        action: 'get_broadcast',
        broadcastId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get broadcast status')
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting broadcast status:', error)
    throw error
  }
}

/**
 * Delete a YouTube broadcast
 */
export async function deleteYouTubeBroadcast(
  broadcastId: string
): Promise<void> {
  try {
    const response = await fetch(YOUTUBE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        action: 'delete_broadcast',
        broadcastId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to delete YouTube broadcast')
    }
  } catch (error) {
    console.error('Error deleting YouTube broadcast:', error)
    throw error
  }
}

/**
 * Send a message to YouTube live chat
 */
export async function sendYouTubeChatMessage(
  liveChatId: string,
  message: string
): Promise<void> {
  try {
    const response = await fetch(YOUTUBE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        action: 'send_chat_message',
        liveChatId,
        message
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send chat message')
    }
  } catch (error) {
    console.error('Error sending chat message:', error)
    throw error
  }
}

/**
 * Get RTMP stream details for OBS broadcasting
 */
export function getStreamDetails(streamUrl: string, streamKey: string): {
  serverUrl: string
  streamKey: string
  fullUrl: string
} {
  return {
    serverUrl: streamUrl,
    streamKey: streamKey,
    fullUrl: `${streamUrl}/${streamKey}`
  }
}
