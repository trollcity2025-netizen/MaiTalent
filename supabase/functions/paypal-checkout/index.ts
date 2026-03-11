import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYPAL_API_BASE = Deno.env.get('PAYPAL_MODE') === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Coin pack definitions (should match frontend)
const coinPacks = [
  { id: 1, coins: 100, bonus: 0, price: 0.99 },
  { id: 2, coins: 500, bonus: 25, price: 4.99 },
  { id: 3, coins: 1000, bonus: 100, price: 9.99 },
  { id: 4, coins: 2500, bonus: 500, price: 24.99 },
  { id: 5, coins: 5000, bonus: 1500, price: 49.99 },
  { id: 6, coins: 10000, bonus: 5000, price: 99.99 },
]

// Calculate price: $0.01 per coin (100 coins = $1)
function calculatePrice(coins: number): number {
  return Math.max(0.99, coins * 0.01)
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('VITE_PAYPAL_CLIENT_ID')
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
  }

  const auth = btoa(`${clientId}:${clientSecret}`)
  
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await response.json()
  return data.access_token
}

async function createPayPalOrder(packId: number, userId: string, supabase: any, customCoins?: number): Promise<any> {
  let pack
  let isCustom = false
  
  if (customCoins && customCoins >= 100) {
    // Custom amount purchase
    pack = {
      id: 0,
      coins: customCoins,
      bonus: 0,
      price: calculatePrice(customCoins)
    }
    isCustom = true
  } else {
    pack = coinPacks.find(p => p.id === packId)
    if (!pack) {
      throw new Error('Invalid coin pack')
    }
  }

  const accessToken = await getAccessToken()

  // Create order with PayPal
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `${userId}_${packId}_${Date.now()}`,
        description: isCustom ? `${pack.coins} MaiTalent Coins (Custom)` : `${pack.coins} MaiTalent Coins`,
        soft_descriptor: 'MAITALENT',
        amount: {
          currency_code: 'USD',
          value: pack.price.toFixed(2),
        },
      }],
      application_context: {
        brand_name: 'MaiTalent',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${Deno.env.get('VITE_APP_URL')}/success`,
        cancel_url: `${Deno.env.get('VITE_APP_URL')}/cancel`,
      },
    }),
  })

  const order = await response.json()

  if (!response.ok) {
    console.error('PayPal create order error:', order)
    throw new Error(order.message || 'Failed to create PayPal order')
  }

  // Store pending payment in database
  const { error: insertError } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      paypal_order_id: order.id,
      amount: pack.price,
      coins_purchased: pack.coins,
      bonus_coins: pack.bonus,
      status: 'pending',
    })

  if (insertError) {
    console.error('Database insert error:', insertError)
    throw new Error('Failed to record payment')
  }

  return order
}

async function capturePayPalOrder(orderId: string, userId: string, supabase: any): Promise<any> {
  const accessToken = await getAccessToken()

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const capture = await response.json()

  if (!response.ok) {
    console.error('PayPal capture error:', capture)
    
    // Update payment status to failed
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('paypal_order_id', orderId)
    
    throw new Error(capture.message || 'Payment failed')
  }

  // Get payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('paypal_order_id', orderId)
    .single()

  if (paymentError || !payment) {
    throw new Error('Payment record not found')
  }

  // Complete the payment (add coins to user)
  const { data: result, error: completeError } = await supabase.rpc('complete_payment', {
    p_paypal_order_id: orderId,
    p_user_id: userId,
  })

  if (completeError) {
    console.error('Complete payment error:', completeError)
    throw new Error('Failed to complete payment')
  }

  // Update payment with capture ID
  await supabase
    .from('payments')
    .update({
      paypal_capture_id: capture.purchase_units?.[0]?.payments?.captures?.[0]?.id,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('paypal_order_id', orderId)

  return { capture, coinsAdded: result }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, packId, orderId, customCoins } = await req.json()

    if (action === 'create') {
      if (!packId && !customCoins) {
        return new Response(JSON.stringify({ error: 'packId or customCoins is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const order = await createPayPalOrder(packId || 0, user.id, supabase, customCoins)
      
      return new Response(JSON.stringify(order), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } 
    else if (action === 'capture') {
      if (!orderId) {
        return new Response(JSON.stringify({ error: 'orderId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const result = await capturePayPalOrder(orderId, user.id, supabase)
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    console.error('PayPal checkout error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
