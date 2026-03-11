import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYPAL_API_BASE = Deno.env.get('PAYPAL_MODE') === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Payout tiers (should match frontend)
const payoutTiers = [
  { id: 1, coins: 15000, payout: 50 },
  { id: 2, coins: 30000, payout: 150 },
  { id: 3, coins: 60000, payout: 300 },
  { id: 4, coins: 120000, payout: 600 },
  { id: 5, coins: 200000, payout: 1000 },
]

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_PAYOUTS_CLIENT_ID')
  const clientSecret = Deno.env.get('PAYPAL_PAYOUTS_CLIENT_SECRET')
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal Payout credentials not configured')
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

async function sendPayout(
  recipientEmail: string, 
  amount: number, 
  userId: string, 
  payoutId: string
): Promise<{ success: boolean; error?: string; payoutBatchId?: string }> {
  const accessToken = await getAccessToken()

  const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: payoutId,
        email_subject: 'You have received a payout from MaiTalent',
        email_message: 'Your MaiTalent earnings have been sent to your PayPal account.',
      },
      items: [{
        recipient_type: 'EMAIL',
        amount: {
          value: amount.toFixed(2),
          currency: 'USD',
        },
        receiver: recipientEmail,
        note: 'MaiTalent earnings payout',
      }],
    }),
  })

  const payoutResult = await response.json()

  if (!response.ok) {
    console.error('PayPal payout error:', payoutResult)
    
    // Extract error message
    let errorMessage = 'Payout failed'
    if (payoutResult.details) {
      errorMessage = payoutResult.details.map((d: any) => d.issue || d.description).join(', ')
    } else if (payoutResult.message) {
      errorMessage = payoutResult.message
    }
    
    return { success: false, error: errorMessage }
  }

  return { 
    success: true, 
    payoutBatchId: payoutResult.batch_header?.payout_batch_id 
  }
}

async function verifyAndPayout(
  userId: string,
  paypalEmail: string,
  tierId: number,
  supabase: any
): Promise<any> {
  const tier = payoutTiers.find(t => t.id === tierId)
  if (!tier) {
    throw new Error('Invalid payout tier')
  }

  // Get user info
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    throw new Error('User not found')
  }

  // Check if user has enough coins
  const { data: userData, error: coinError } = await supabase
    .from('users')
    .select('coins')
    .eq('id', userId)
    .single()

  if (coinError || !userData) {
    throw new Error('Failed to fetch user coins')
  }

  if (userData.coins < tier.coins) {
    throw new Error('Insufficient coins for this payout')
  }

  const payoutId = `payout_${userId}_${Date.now()}`

  // Try to send the payout
  const payoutResult = await sendPayout(paypalEmail, tier.payout, userId, payoutId)

  if (!payoutResult.success) {
    // Return error so frontend can show it
    return {
      success: false,
      error: payoutResult.error,
      verified: false,
    }
  }

  // Deduct coins
  const { error: deductError } = await supabase
    .from('users')
    .update({ coins: userData.coins - tier.coins })
    .eq('id', userId)

  if (deductError) {
    console.error('Failed to deduct coins:', deductError)
    // Even if coin deduction fails, the payout was sent
  }

  return {
    success: true,
    payoutBatchId: payoutResult.payoutBatchId,
    amount: tier.payout,
    coinsDeducted: tier.coins,
    verified: true,
  }
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

    const { tierId, paypalEmail } = await req.json()

    if (!tierId || !paypalEmail) {
      return new Response(JSON.stringify({ error: 'tierId and paypalEmail are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await verifyAndPayout(user.id, paypalEmail, tierId, supabase)
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('PayPal payout error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
