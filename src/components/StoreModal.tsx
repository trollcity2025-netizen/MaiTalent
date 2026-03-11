import { useState, useEffect, useRef } from 'react'
import { X, Coins, Gift, Zap, Star, Crown, Sparkles, Check, Loader2, CreditCard } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../lib/supabase'

// Coin packs with bonus options (100 coins = $1)
const coinPacks = [
  {
    id: 1,
    coins: 100,
    bonus: 0,
    price: 0.99,
    priceId: 'PACK_100',
    icon: Coins,
    color: 'from-gray-400 to-gray-600',
    popular: false,
  },
  {
    id: 2,
    coins: 500,
    bonus: 25,
    price: 4.99,
    priceId: 'PACK_500',
    icon: Gift,
    color: 'from-green-400 to-green-600',
    popular: false,
  },
  {
    id: 3,
    coins: 1000,
    bonus: 100,
    price: 9.99,
    priceId: 'PACK_1000',
    icon: Zap,
    color: 'from-blue-400 to-blue-600',
    popular: true,
  },
  {
    id: 4,
    coins: 2500,
    bonus: 500,
    price: 24.99,
    priceId: 'PACK_2500',
    icon: Star,
    color: 'from-purple-400 to-purple-600',
    popular: false,
  },
  {
    id: 5,
    coins: 5000,
    bonus: 1500,
    price: 49.99,
    priceId: 'PACK_5000',
    icon: Crown,
    color: 'from-yellow-400 to-yellow-600',
    popular: false,
  },
  {
    id: 6,
    coins: 10000,
    bonus: 5000,
    price: 99.99,
    priceId: 'PACK_10000',
    icon: Sparkles,
    color: 'from-pink-400 to-pink-600',
    popular: false,
  },
]

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: Record<string, string>
        createOrder: () => Promise<string>
        onApprove: (data: { orderID: string }) => Promise<void>
        onError: (err: Error) => void
      }) => {
        render: (selector: string) => Promise<void>
      }
    }
  }
}

export function StoreModal() {
  const { storeOpen, setStoreOpen, coins, addCoins } = useAppStore()
  const [customAmount, setCustomAmount] = useState('')
  const [selectedPack, setSelectedPack] = useState<number | null>(null)
  const [processing, setProcessing] = useState(false)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const paypalButtonRef = useRef<HTMLDivElement>(null)

  const selectedPackData = coinPacks.find(p => p.id === selectedPack)

  const handleCustomPurchase = () => {
    const amount = parseInt(customAmount)
    if (isNaN(amount) || amount < 100) return
    
    // Trigger PayPal for custom amount
    setSelectedPack(-1) // Use -1 to indicate custom
  }

  // Load PayPal button when a pack is selected (including custom)
  useEffect(() => {
    // Check if PayPal SDK is loaded
    if (!window.paypal) {
      console.warn('PayPal SDK not loaded. Please configure VITE_PAYPAL_CLIENT_ID in .env')
      return
    }

    if (!paypalButtonRef.current) return

    let pack
    let isCustom = false
    let coins = 0
    
    if (selectedPack === -1 && customAmount) {
      // Custom amount
      coins = parseInt(customAmount)
      if (isNaN(coins) || coins < 100) return
      isCustom = true
      pack = { id: 0, coins, price: Math.max(0.99, coins * 0.01) }
    } else if (selectedPack && selectedPack > 0) {
      pack = coinPacks.find(p => p.id === selectedPack)
      if (pack) coins = pack.coins + pack.bonus
    }
    
    if (!pack) return

    // Clear previous buttons
    paypalButtonRef.current.innerHTML = ''

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal'
        },
        createOrder: async () => {
          // Call our edge function to create a PayPal order
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('Not authenticated')

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-checkout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
              action: 'create',
              packId: isCustom ? 0 : selectedPack,
              customCoins: isCustom ? coins : undefined,
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to create order')
          }

          const order = await response.json()
          return order.id
        },
        onApprove: async (data) => {
          setProcessing(true)
          try {
            // Capture the payment through our edge function
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-checkout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              },
              body: JSON.stringify({
                action: 'capture',
                orderId: data.orderID,
              }),
            })

            if (!response.ok) {
              const error = await response.json()
              throw new Error(error.error || 'Payment failed')
            }

            const result = await response.json()
            
            // Add coins to local state
            addCoins(result.coinsAdded)
            setPurchaseSuccess(true)
            setSelectedPack(null)
            setCustomAmount('')
            
            // Reset success message after 3 seconds
            setTimeout(() => {
              setPurchaseSuccess(false)
            }, 3000)
          } catch (err) {
            console.error('Payment error:', err)
            alert(err instanceof Error ? err.message : 'Payment failed. Please try again.')
          } finally {
            setProcessing(false)
          }
        },
        onError: (err: Error) => {
          console.error('Paypal error:', err)
          alert('Payment failed. Please try again.')
          setProcessing(false)
        }
      }).render('#paypal-button-container')
    } catch (err) {
      console.error('Error rendering PayPal buttons:', err)
    }
  }, [selectedPack, customAmount, addCoins])

  if (!storeOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setStoreOpen(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 glass rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-yellow to-neon-gold flex items-center justify-center">
              <Coins className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Coin Store</h2>
              <p className="text-gray-400">Your balance: <span className="text-neon-yellow font-bold">{coins.toLocaleString()}</span> coins</p>
            </div>
          </div>
          <button
            onClick={() => setStoreOpen(false)}
            className="w-10 h-10 rounded-full glass hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Success Message */}
        {purchaseSuccess && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3">
            <Check className="w-6 h-6 text-green-400" />
            <span className="text-green-400 font-bold">Purchase successful! Coins added to your account.</span>
          </div>
        )}

        {/* Coin Packs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {coinPacks.map((pack) => (
            <button
              key={pack.id}
              onClick={() => setSelectedPack(pack.id)}
              disabled={processing}
              className={`relative glass rounded-xl p-4 text-left transition-all hover:scale-105 ${
                selectedPack === pack.id 
                  ? 'border-2 border-neon-yellow bg-neon-yellow/10 shadow-lg shadow-neon-yellow/20' 
                  : 'border border-white/10 hover:border-white/30'
              } ${pack.popular ? 'ring-2 ring-neon-yellow/50' : ''} ${processing ? 'opacity-50' : ''}`}
            >
              {pack.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-neon-yellow text-black text-xs font-bold rounded-full">
                  BEST VALUE
                </span>
              )}
              {selectedPack === pack.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-neon-yellow rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-black" />
                </div>
              )}
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${pack.color} flex items-center justify-center mb-3`}>
                <pack.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-white font-bold text-lg">{pack.coins.toLocaleString()}</div>
              {pack.bonus > 0 && (
                <div className="text-green-400 text-sm font-medium">+{pack.bonus.toLocaleString()} bonus!</div>
              )}
              <div className="text-gray-400 text-sm mt-1">${pack.price}</div>
            </button>
          ))}
        </div>

        {/* PayPal Button Container */}
        {(selectedPack || selectedPack === -1) && !purchaseSuccess && selectedPackData && (
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <div className="text-center mb-4">
              <p className="text-white font-bold">
                Purchase {selectedPack === -1 ? parseInt(customAmount).toLocaleString() : selectedPackData.coins.toLocaleString()} coins
                {selectedPack !== -1 && selectedPackData.bonus > 0 && (
                  <span className="text-green-400"> + {selectedPackData.bonus.toLocaleString()} bonus</span>
                )}
              </p>
              <p className="text-gray-400">Total: ${selectedPack === -1 ? Math.max(0.99, parseInt(customAmount) * 0.01).toFixed(2) : selectedPackData.price}</p>
            </div>
            <div id="paypal-button-container" ref={paypalButtonRef} className="min-h-[150px] flex items-center justify-center">
              {processing && (
                <div className="flex items-center gap-2 text-neon-yellow">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing payment...
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <CreditCard className="w-4 h-4" />
              <span>Pay with PayPal, debit card, or credit card</span>
            </div>
          </div>
        )}

        {/* Custom Amount */}
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-lg font-bold text-white mb-4">Custom Amount</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter coins (min 100)"
                min="100"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-yellow"
              />
            </div>
            <button
              onClick={handleCustomPurchase}
              disabled={processing || !customAmount || parseInt(customAmount) < 100}
              className="px-6 py-3 bg-gradient-to-r from-neon-yellow to-neon-gold text-black font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {processing ? 'Processing...' : `Buy ${customAmount ? parseInt(customAmount).toLocaleString() : 0} Coins`}
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Rate: 100 coins = $1.00 • Minimum purchase: 100 coins
          </p>
        </div>

        {/* Info */}
        <div className="mt-8 pt-4 border-t border-white/10">
          <p className="text-gray-500 text-xs text-center">
            Coins are virtual currency for the MaiTalent platform. All purchases are final and non-refundable.
            <br />
            Payments secured by PayPal.
          </p>
        </div>
      </div>
    </div>
  )
}
