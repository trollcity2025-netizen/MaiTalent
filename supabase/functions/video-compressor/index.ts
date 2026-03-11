// Video Compressor Edge Function using Mux
// Triggered by storage webhooks when videos are uploaded to 'shows' bucket

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StorageEvent {
  type: 'INSERT'
  record: {
    bucket_id: string
    name: string
    id: string
    size: number
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const event: StorageEvent = await req.json()
    
    // Only process videos in 'shows' bucket
    if (event.record.bucket_id !== 'shows') {
      return new Response(JSON.stringify({ message: 'Skipping - not a show video' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const fileName = event.record.name
    const fileSize = event.record.size
    
    console.log(`Processing video: ${fileName}, size: ${fileSize} bytes`)

    // Get environment variables
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID')
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!muxTokenId || !muxTokenSecret) {
      console.warn('Mux credentials not configured, skipping compression')
      return new Response(JSON.stringify({ 
        message: 'Mux not configured, video stored but not compressed',
        file: fileName,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the uploaded video URL from storage
    const objectUrl = `${supabaseUrl}/storage/v1/object/public/shows/${fileName}`
    
    console.log(`Uploading to Mux: ${objectUrl}`)

    // Create Mux asset from URL
    const muxResponse = await fetch('https://api.mux.com/video/v1/assets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
      },
      body: JSON.stringify({
        input: objectUrl,
        playback_policy: ['public'],
        encoding_tier: 'baseline', // Use baseline for faster processing
        test: false,
      }),
    })

    const muxData = await muxResponse.json()
    
    if (!muxResponse.ok) {
      console.error('Mux error:', muxData)
      throw new Error(`Mux API error: ${JSON.stringify(muxData)}`)
    }

    const muxAssetId = muxData.data.id
    const muxPlaybackId = muxData.data.playback_ids?.[0]?.id

    console.log(`Mux asset created: ${muxAssetId}, playback ID: ${muxPlaybackId}`)

    // Update storage metadata with Mux info
    const updateRes = await fetch(
      `${supabaseUrl}/storage/v1/objects/${event.record.bucket_id}/${event.record.name}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          metadata: {
            compression_status: 'completed',
            mux_asset_id: muxAssetId,
            mux_playback_id: muxPlaybackId,
            processed_at: new Date().toISOString(),
          }
        }),
      }
    )

    if (!updateRes.ok) {
      const errorText = await updateRes.text()
      console.error('Failed to update metadata:', errorText)
    }

    return new Response(JSON.stringify({ 
      message: 'Video compressed successfully',
      file: fileName,
      mux_asset_id: muxAssetId,
      mux_playback_id: muxPlaybackId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error processing video:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
