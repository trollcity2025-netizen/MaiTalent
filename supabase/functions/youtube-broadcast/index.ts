/**
 * YouTube Broadcast Edge Function
 * 
 * This Supabase Edge Function handles the YouTube Data API v3 integration
 * for creating and managing live broadcasts.
 * 
 * Required environment variables:
 * - YOUTUBE_CLIENT_ID
 * - YOUTUBE_CLIENT_SECRET
 * - YOUTUBE_REFRESH_TOKEN
 * - YOUTUBE_CHANNEL_ID
 * 
 * Required YouTube API scopes:
 * - https://www.googleapis.com/auth/youtube
 * - https://www.googleapis.com/auth/youtube.force-ssl
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// YouTube API configuration
const YOUTUBE_CLIENT_ID = Deno.env.get('YOUTUBE_CLIENT_ID')!
const YOUTUBE_CLIENT_SECRET = Deno.env.get('YOUTUBE_CLIENT_SECRET')!
const YOUTUBE_REFRESH_TOKEN = Deno.env.get('YOUTUBE_REFRESH_TOKEN')!
const YOUTUBE_CHANNEL_ID = Deno.env.get('YOUTUBE_CHANNEL_ID')!

const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Get a fresh access token using the refresh token
 */
async function getAccessToken(): Promise<string> {
  const credentials = btoa(`${YOUTUBE_CLIENT_ID}:${YOUTUBE_CLIENT_SECRET}`)
  
  const response = await fetch(YOUTUBE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: new URLSearchParams({
      refresh_token: YOUTUBE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`)
  }

  return data.access_token
}

/**
 * Make an authenticated YouTube API request
 */
async function youtubeRequest(endpoint: string, method: string, body?: object): Promise<any> {
  const accessToken = await getAccessToken()
  
  const response = await fetch(`${YOUTUBE_API_BASE}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`YouTube API error: ${JSON.stringify(data)}`)
  }

  return data
}

/**
 * Create a new YouTube live broadcast
 */
async function createBroadcast(
  title: string,
  description: string,
  scheduledStartTime: string,
  visibility: string
) {
  const broadcast = {
    snippet: {
      title,
      description,
      scheduledStartTime,
      scheduledEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours later
    },
    status: {
      privacyStatus: visibility,
      selfDeclaredMadeForKids: false,
    },
    contentDetails: {
      recordFromStart: true,
      enableAutoStart: false,
      enableAutoStop: false,
    }
  }

  const result = await youtubeRequest('/liveBroadcasts?part=snippet,status,contentDetails', 'POST', broadcast)
  
  return {
    id: result.items[0].id,
    snippet: result.items[0].snippet,
    status: result.items[0].status,
    contentDetails: result.items[0].contentDetails
  }
}

/**
 * Create a YouTube stream (RTMP endpoint)
 */
async function createStream(title: string, description: string) {
  const stream = {
    snippet: {
      title,
      description,
    },
    cdn: {
      ingestionType: 'rtmp',
      resolution: '1080p',
      frameRate: '30fps',
      bitrate: '4500k',
    }
  }

  const result = await youtubeRequest('/liveStreams?part=snippet,cdn', 'POST', stream)
  
  return {
    id: result.items[0].id,
    snippet: result.items[0].snippet,
    cdn: result.items[0].cdn
  }
}

/**
 * Bind a broadcast to a stream
 */
async function bindBroadcast(broadcastId: string, streamId: string) {
  await youtubeRequest(
    `/liveBroadcasts/bind?id=${broadcastId}&streamId=${streamId}&part=snippet,status`,
    'POST'
  )
}

/**
 * Transition a broadcast to a specific status
 */
async function transitionBroadcast(broadcastId: string, status: string) {
  const validStatuses = ['testing', 'live', 'complete']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`)
  }

  await youtubeRequest(
    `/liveBroadcasts/transition?broadcastId=${broadcastId}&broadcastStatus=${status}&part=snippet,status`,
    'POST'
  )
}

/**
 * Get broadcast details
 */
async function getBroadcast(broadcastId: string) {
  const result = await youtubeRequest(
    `/liveBroadcasts?id=${broadcastId}&part=snippet,status,contentDetails`,
    'GET'
  )
  
  return result.items[0]
}

/**
 * Delete a broadcast
 */
async function deleteBroadcast(broadcastId: string) {
  await youtubeRequest(`/liveBroadcasts?id=${broadcastId}`, 'DELETE')
}

/**
 * Get live chat ID for a broadcast
 */
async function getLiveChatId(broadcastId: string): Promise<string | null> {
  const broadcast = await getBroadcast(broadcastId)
  return broadcast?.contentDetails?.liveChatId || null
}

/**
 * Send a message to live chat
 */
async function sendChatMessage(liveChatId: string, message: string, accessToken: string) {
  await fetch(`${YOUTUBE_API_BASE}/liveChat/messages?part=snippet`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      snippet: {
        liveChatId,
        type: 'textMessageEvent',
        textMessageDetails: {
          messageText: message
        }
      }
    })
  })
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { action, ...params } = await req.json()

    let response: any

    switch (action) {
      case 'create_broadcast': {
        const { title, description, scheduledStartTime, visibility } = params
        
        // Create the broadcast
        const broadcast = await createBroadcast(
          title,
          description,
          scheduledStartTime,
          visibility || 'public'
        )
        
        // Create a stream
        const stream = await createStream(title, description)
        
        // Bind broadcast to stream
        await bindBroadcast(broadcast.id, stream.id)
        
        // Get the RTMP ingestion info
        const streamDetails = stream.cdn.ingestionInfo
        
        response = {
          broadcast_id: broadcast.id,
          stream_id: stream.id,
          stream_key: streamDetails.streamName,
          stream_url: `rtmp://a.rtmp.youtube.com/live2`,
          ingestion_type: 'rtmp',
          live_chat_id: broadcast.contentDetails?.liveChatId || null
        }

        // Store in database
        // Note: The show_id would need to be passed in the request
        break
      }

      case 'create_stream': {
        const { title, description } = params
        const stream = await createStream(title, description)
        
        response = stream
        break
      }

      case 'bind_broadcast': {
        const { broadcastId, streamId } = params
        await bindBroadcast(broadcastId, streamId)
        
        response = { success: true }
        break
      }

      case 'transition_broadcast': {
        const { broadcastId, status } = params
        await transitionBroadcast(broadcastId, status)
        
        response = { success: true }
        break
      }

      case 'get_broadcast': {
        const { broadcastId } = params
        const broadcast = await getBroadcast(broadcastId)
        
        response = broadcast
        break
      }

      case 'end_broadcast': {
        const { broadcastId } = params
        
        // Transition to complete status
        await transitionBroadcast(broadcastId, 'complete')
        
        // Delete the broadcast (keeps the recording)
        // await deleteBroadcast(broadcastId)
        
        response = { success: true }
        break
      }

      case 'delete_broadcast': {
        const { broadcastId } = params
        await deleteBroadcast(broadcastId)
        
        response = { success: true }
        break
      }

      case 'send_chat_message': {
        const { liveChatId, message } = params
        const accessToken = await getAccessToken()
        await sendChatMessage(liveChatId, message, accessToken)
        
        response = { success: true }
        break
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
