import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Mux configuration from environment
const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID') || ''
const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MuxLiveStreamResponse {
  data: {
    id: string
    playback_id: string
    stream_key: string
    status: string
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Get request body
    const { showId, streamKey } = await req.json()
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user is authorized (host or admin)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Handle DELETE request - stop stream
    if (req.method === 'DELETE') {
      // Get current stream info
      const { data: show } = await supabase
        .from('shows')
        .select('mux_stream_id')
        .eq('id', showId)
        .single()

      if (show?.mux_stream_id) {
        // Call Mux API to end the live stream
        const muxResponse = await fetch(`https://api.mux.com/video/v1/live-streams/${show.mux_stream_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)}`,
            'Content-Type': 'application/json'
          }
        })

        if (!muxResponse.ok) {
          console.error('Failed to delete Mux stream:', await muxResponse.text())
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Handle POST request - create/start stream
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return new Response(JSON.stringify({ error: 'Mux credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create Mux live stream
    const muxResponse = await fetch('https://api.mux.com/video/v1/live-streams', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        playback_policy: ['public'],
        new_asset_settings: {
          playback_policy: ['public']
        },
        stream_key: streamKey,
        force_static_rtmp_ingest_url: false
      })
    })

    if (!muxResponse.ok) {
      const errorText = await muxResponse.text()
      console.error('Mux API error:', errorText)
      return new Response(JSON.stringify({ error: 'Failed to create Mux stream' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const muxData: MuxLiveStreamResponse = await muxResponse.json()
    
    // Return stream info
    return new Response(JSON.stringify({
      streamId: muxData.data.id,
      playbackId: muxData.data.playback_id,
      streamKey: muxData.data.stream_key,
      rtmpIngestUrl: `rtmp://live.mux.com/app/${muxData.data.stream_key}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
