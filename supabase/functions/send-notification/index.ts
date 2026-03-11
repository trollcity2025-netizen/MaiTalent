import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// OneSignal Configuration
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') || ''
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY') || ''

interface SendNotificationRequest {
  userId?: string
  playerIds?: string[]
  title: string
  message: string
  data?: Record<string, unknown>
  type?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request
    const body: SendNotificationRequest = await req.json()

    const { userId, playerIds, title, message, data, type } = body

    // If no player IDs provided, try to get them from user ID
    let targetPlayerIds = playerIds || []

    if (!targetPlayerIds.length && userId) {
      const { data: notificationData, error } = await supabase
        .from('user_notifications')
        .select('onesignal_player_id')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (!error && notificationData) {
        targetPlayerIds = notificationData
          .map((n) => n.onesignal_player_id)
          .filter(Boolean)
      }
    }

    // If still no player IDs, return early
    if (!targetPlayerIds.length) {
      return new Response(
        JSON.stringify({ success: false, message: 'No player IDs found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Build OneSignal notification payload
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      data: data || { type },
      include_player_ids: targetPlayerIds,
    }

    // Send notification via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    })

    const result = await response.json()

    // Log the notification in database
    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: type || 'general',
        title,
        message,
        data: data ? JSON.stringify(data) : null,
        is_read: false,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent',
        onesignalResponse: result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending notification:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
