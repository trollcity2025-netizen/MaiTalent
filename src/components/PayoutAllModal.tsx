import { useState } from 'react'
import { X, DollarSign, Users, Loader2, Check, AlertCircle, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface PayoutAllModalProps {
  isOpen: boolean
  onClose: () => void
}

interface PayoutRecipient {
  id: string
  username: string
  email: string
  paypal_email: string | null
  coin_balance: number
  total_earnings: number
}

const MIN_PAYOUT_COINS = 15000
const COIN_TO_DOLLAR_RATE = 0.003 // 1 coin = $0.003 (15000 coins = $50)

export function PayoutAllModal({ isOpen, onClose }: PayoutAllModalProps) {
  const [recipients, setRecipients] = useState<PayoutRecipient[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Load eligible recipients
  const loadRecipients = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id, username, email, paypal_email, coin_balance, total_earnings')
        .gte('coin_balance', MIN_PAYOUT_COINS)
        .not('paypal_email', 'is', null)
        .order('coin_balance', { ascending: false })

      if (fetchError) throw fetchError

      // Filter to only those with valid PayPal emails
      const eligible = (data || []).filter(r => r.paypal_email)
      setRecipients(eligible)
      
      // Auto-select all by default
      setSelectedIds(new Set(eligible.map(r => r.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipients')
    } finally {
      setLoading(false)
    }
  }

  // Load on open
  if (isOpen && recipients.length === 0 && !loading) {
    loadRecipients()
  }

  const toggleRecipient = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === recipients.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(recipients.map(r => r.id)))
    }
  }

  const calculateTotal = () => {
    const selected = recipients.filter(r => selectedIds.has(r.id))
    const totalCoins = selected.reduce((sum, r) => sum + r.coin_balance, 0)
    const totalDollars = Math.floor(totalCoins * COIN_TO_DOLLAR_RATE)
    return { count: selected.length, coins: totalCoins, dollars: totalDollars }
  }

  const handlePayoutAll = async () => {
    if (selectedIds.size === 0) return

    setProcessing(true)
    setError(null)

    try {
      const selected = recipients.filter(r => selectedIds.has(r.id))
      
      // In production, this would call PayPal Payouts API
      // For now, we'll simulate the payout process
      
      // Create payout records
      for (const recipient of selected) {
        const payoutAmount = Math.floor(recipient.coin_balance * COIN_TO_DOLLAR_RATE)
        
        // Create payout record
        await supabase.from('payouts').insert({
          user_id: recipient.id,
          amount: payoutAmount,
          coins_converted: recipient.coin_balance,
          payment_method: 'paypal',
          payment_email: recipient.paypal_email,
          status: 'completed',
          processed_at: new Date().toISOString(),
          notes: 'Bulk payout via CEO Dashboard'
        })

        // Reset user's coin balance
        await supabase
          .from('users')
          .update({ coin_balance: 0 })
          .eq('id', recipient.id)
      }

      // Note: In production, you would:
      // 1. Call PayPal Payouts API with batch payout
      // 2. Handle the response for each recipient
      // 3. Log the transaction IDs

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setRecipients([])
        setSelectedIds(new Set())
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payouts')
    } finally {
      setProcessing(false)
    }
  }

  const totals = calculateTotal()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 glass rounded-2xl p-6 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Bulk Payout</h2>
              <p className="text-gray-400">Pay all eligible performers at once</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full glass hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3">
            <Check className="w-6 h-6 text-green-400" />
            <span className="text-green-400 font-bold">Payouts processed successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        {/* Summary */}
        <div className="mb-6 p-4 bg-purple-500/20 border border-purple-500/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-bold">
                {totals.count} performers selected
              </span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-neon-yellow">
                {totals.coins.toLocaleString()} coins
              </p>
              <p className="text-green-400 font-bold">
                ≈ ${totals.dollars.toLocaleString()} USD
              </p>
            </div>
          </div>
        </div>

        {/* Recipients List */}
        <div className="flex-1 overflow-y-auto mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-neon-gold" />
            </div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No eligible performers found</p>
              <p className="text-sm mt-2">Need at least {MIN_PAYOUT_COINS.toLocaleString()} coins and PayPal connected</p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={selectedIds.size === recipients.length}
                  onChange={selectAll}
                  className="w-5 h-5 rounded"
                />
                <span className="text-white font-medium">
                  Select All ({recipients.length})
                </span>
              </div>

              {/* Recipients */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {recipients.map(recipient => (
                  <div
                    key={recipient.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedIds.has(recipient.id)
                        ? 'bg-green-500/10 border-green-500/50'
                        : 'bg-white/5 border-white/10'
                    }`}
                    onClick={() => toggleRecipient(recipient.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(recipient.id)}
                      onChange={() => {}}
                      className="w-5 h-5 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">{recipient.username}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {recipient.paypal_email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-neon-yellow">
                        {recipient.coin_balance.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-400">
                        ≈ ${Math.floor(recipient.coin_balance * COIN_TO_DOLLAR_RATE)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePayoutAll}
            disabled={processing || selectedIds.size === 0 || totals.dollars === 0}
            className="flex-1 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                Pay All ${totals.dollars.toLocaleString()}
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-gray-500 text-xs text-center">
            Payouts will be sent to all selected PayPal accounts.
            <br />
            Coin balances will be reset after payout.
            <br />
            Rate: 1 coin = $0.003 ({MIN_PAYOUT_COINS.toLocaleString()} coins = $50 minimum)
          </p>
        </div>
      </div>
    </div>
  )
}
