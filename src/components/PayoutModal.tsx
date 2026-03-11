import { useState, useMemo } from 'react'
import { X, DollarSign, Gift, Star, Crown, Sparkles, Wallet, Check, AlertCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../lib/supabase'

// Payout tiers: coins required -> dollar amount
const payoutTiers = [
  {
    id: 1,
    coins: 15000,
    payout: 50,
    icon: DollarSign,
    color: 'from-green-400 to-green-600',
  },
  {
    id: 2,
    coins: 30000,
    payout: 150,
    icon: Gift,
    color: 'from-blue-400 to-blue-600',
  },
  {
    id: 3,
    coins: 60000,
    payout: 300,
    icon: Star,
    color: 'from-purple-400 to-purple-600',
  },
  {
    id: 4,
    coins: 120000,
    payout: 600,
    icon: Crown,
    color: 'from-yellow-400 to-yellow-600',
  },
  {
    id: 5,
    coins: 200000,
    payout: 1000,
    icon: Sparkles,
    color: 'from-pink-400 to-pink-600',
  },
]

// Check if today is Friday (day 5 in JavaScript)
const isFriday = (): boolean => {
  const today = new Date()
  return today.getDay() === 5
}

const getNextFriday = (): string => {
  const today = new Date()
  const friday = new Date(today)
  friday.setDate(today.getDate() + (5 - today.getDay() + 7) % 7)
  return friday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function PayoutModal() {
  const { payoutOpen, setPayoutOpen, coins, spendCoins, user } = useAppStore()
  const [selectedTier, setSelectedTier] = useState<number | null>(null)
  const [processing, setProcessing] = useState(false)
  const [payoutSuccess, setPayoutSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canPayout = isFriday()
  const nextFriday = getNextFriday()

  const availableTiers = useMemo(() => {
    return payoutTiers.filter(tier => coins >= tier.coins)
  }, [coins])

  const highestTier = useMemo(() => {
    return availableTiers.length > 0 
      ? availableTiers.reduce((a, b) => a.coins > b.coins ? a : b)
      : null
  }, [availableTiers])

  if (!payoutOpen) return null

  const handlePayoutRequest = async () => {
    if (!selectedTier) return

    const tier = payoutTiers.find(t => t.id === selectedTier)
    if (!tier) return

    if (!canPayout) {
      setError(`Payouts are only processed on Fridays. Next payout date: ${nextFriday}`)
      return
    }

    if (coins < tier.coins) {
      setError('Insufficient coins for this payout tier')
      return
    }

    if (!user?.paypal_email) {
      setError('Please connect your PayPal account first')
      return
    }

    if (!user.paypal_verified) {
      setError('Please confirm your PayPal email is verified in Settings → PayPal Settings')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Call the PayPal payout edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          tierId: selectedTier,
          paypalEmail: user.paypal_email,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Check if it's a verification error
        if (!result.verified) {
          setError(result.error || 'PayPal verification failed. Please check your PayPal email and try again.')
          return
        }
        throw new Error(result.error || 'Payout failed')
      }

      // Deduct coins from local state
      spendCoins(result.coinsDeducted)
      
      setProcessing(false)
      setPayoutSuccess(true)
      setSelectedTier(null)

      // Reset success message after 3 seconds
      setTimeout(() => {
        setPayoutSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Payout error:', err)
      setError(err instanceof Error ? err.message : 'Payout failed. Please try again.')
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setPayoutOpen(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 glass rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Payout Center</h2>
              <p className="text-gray-400">Your balance: <span className="text-neon-yellow font-bold">{coins.toLocaleString()}</span> coins</p>
            </div>
          </div>
          <button
            onClick={() => setPayoutOpen(false)}
            className="w-10 h-10 rounded-full glass hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Friday Status */}
        <div className={`mb-6 p-4 rounded-lg ${canPayout ? 'bg-green-500/20 border border-green-500/50' : 'bg-yellow-500/20 border border-yellow-500/50'}`}>
          <div className="flex items-center gap-3">
            {canPayout ? (
              <>
                <Check className="w-6 h-6 text-green-400" />
                <span className="text-green-400 font-bold">Today is Friday! Payouts are available.</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 text-yellow-400" />
                <span className="text-yellow-400 font-bold">Payouts are processed on Fridays only.</span>
              </>
            )}
          </div>
          {!canPayout && (
            <p className="text-gray-400 text-sm mt-2 ml-9">Next payout date: {nextFriday}</p>
          )}
        </div>

        {/* Success Message */}
        {payoutSuccess && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3">
            <Check className="w-6 h-6 text-green-400" />
            <span className="text-green-400 font-bold">Payout sent to your PayPal account! Allow 2-3 business days for processing.</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <span className="text-red-400 font-bold">{error}</span>
          </div>
        )}

        {!user?.paypal_email && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-yellow-400 font-bold">PayPal Not Connected</p>
                <p className="text-gray-400 text-sm">Please connect your PayPal account in the wallet menu to receive payouts.</p>
              </div>
            </div>
          </div>
        )}

        {/* PayPal Not Verified Warning */}
        {user?.paypal_email && !user.paypal_verified && (
          <div className="mb-6 p-4 bg-orange-500/20 border border-orange-500/50 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-orange-400" />
              <div>
                <p className="text-orange-400 font-bold">PayPal Email Not Confirmed</p>
                <p className="text-gray-400 text-sm">You need to confirm your PayPal email is verified in Settings → PayPal Settings. Check the box to confirm you've verified your email in PayPal.</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Tier Progress */}
        {highestTier && (
          <div className="mb-6 p-4 bg-purple-500/20 border border-purple-500/50 rounded-lg">
            <p className="text-purple-400 font-bold mb-2">🎉 You're eligible for a payout!</p>
            <p className="text-gray-400 text-sm">Your highest available tier: {highestTier.coins.toLocaleString()} coins → ${highestTier.payout}</p>
          </div>
        )}

        {/* Payout Tiers */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-bold text-white">Select Payout Tier</h3>
          {payoutTiers.map((tier) => {
            const isAvailable = coins >= tier.coins
            const isSelected = selectedTier === tier.id
            
            return (
              <button
                key={tier.id}
                onClick={() => isAvailable && setSelectedTier(tier.id)}
                disabled={!isAvailable || processing}
                className={`w-full glass rounded-xl p-4 text-left transition-all ${
                  isSelected ? 'border-2 border-green-400' : ''
                } ${!isAvailable ? 'opacity-40' : 'hover:scale-102 cursor-pointer'} ${processing ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                      <tier.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg">{tier.coins.toLocaleString()} coins</div>
                      <div className="text-gray-400 text-sm">→ ${tier.payout} USD via PayPal</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {!isAvailable && (
                      <span className="text-gray-500 text-sm">
                        Need { (tier.coins - coins).toLocaleString() } more
                      </span>
                    )}
                    {isAvailable && (
                      <span className="text-green-400 font-bold">Available</span>
                    )}
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isAvailable ? 'bg-green-400' : 'bg-gray-500'}`}
                    style={{ width: `${Math.min((coins / tier.coins) * 100, 100)}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* Payout Button */}
        {selectedTier && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
            <button
              onClick={handlePayoutRequest}
              disabled={processing || !canPayout}
              className="px-8 py-4 bg-gradient-to-r from-green-400 to-green-600 text-white font-bold text-lg rounded-full shadow-lg hover:shadow-green-400/50 transition-all hover:scale-105 disabled:opacity-50"
            >
              {processing ? (
                'Processing Payout...'
              ) : !canPayout ? (
                `Payouts Available on Friday`
              ) : (
                `Request Payout: ${payoutTiers.find(t => t.id === selectedTier)!.coins.toLocaleString()} coins → $${payoutTiers.find(t => t.id === selectedTier)!.payout}`
              )}
            </button>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 pt-4 border-t border-white/10">
          <p className="text-gray-500 text-xs text-center">
            Payouts are processed weekly on Fridays via PayPal.
            <br />
            Minimum payout: 15,000 coins ($50)
            <br />
            Please ensure your PayPal email is set in your profile.
          </p>
        </div>
      </div>
    </div>
  )
}
