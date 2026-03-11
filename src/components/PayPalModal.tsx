import { useState, useEffect } from 'react'
import { X, Mail, Shield, Check, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

export function PayPalModal() {
  const { paypalModalOpen, setPaypalModalOpen, user, setPaypalInfo } = useAppStore()
  const [email, setEmail] = useState('')
  const [confirmedVerified, setConfirmedVerified] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user?.paypal_email) {
      setEmail(user.paypal_email)
      setConfirmedVerified(user.paypal_verified || false)
    }
  }, [user])

  if (!paypalModalOpen) return null

  const validateEmail = (email: string): boolean => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSave = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        setError('You must be logged in to update PayPal email')
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          paypal_email: email.toLowerCase(),
          paypal_verified: confirmedVerified
        })
        .eq('id', authUser.id)

      if (updateError) throw updateError

      // Update store state
      setPaypalInfo(email.toLowerCase(), false)
      
      setSuccess(true)
      setTimeout(() => {
        setPaypalModalOpen(false)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update PayPal email')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    setSaving(true)
    setError(null)

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        setError('You must be logged in')
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          paypal_email: null,
          paypal_verified: false
        })
        .eq('id', authUser.id)

      if (updateError) throw updateError

      // Update store state
      setPaypalInfo(null, false)
      setEmail('')
      
      setSuccess(true)
      setTimeout(() => {
        setPaypalModalOpen(false)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect PayPal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setPaypalModalOpen(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 glass rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">PayPal Account</h2>
              <p className="text-gray-400">Connect your PayPal for payouts</p>
            </div>
          </div>
          <button
            onClick={() => setPaypalModalOpen(false)}
            className="w-10 h-10 rounded-full glass hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Current Status */}
        {user?.paypal_email && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-green-400 font-bold">PayPal Connected</p>
                <p className="text-gray-400 text-sm">{user.paypal_email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3">
            <Check className="w-6 h-6 text-green-400" />
            <span className="text-green-400 font-bold">PayPal account updated successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        {/* Email Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            PayPal Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
            />
          </div>
          <p className="text-gray-500 text-xs mt-2">
            This email will be used for processing your weekly payouts via PayPal.
          </p>
        </div>

        {/* Email Notice */}
        <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-300 text-sm">
              Enter your PayPal email address. Make sure this email is verified in your PayPal account before requesting payouts.
            </p>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmedVerified}
              onChange={(e) => setConfirmedVerified(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-2 border-gray-500 bg-transparent checked:bg-green-500 checked:border-green-500 focus:ring-2 focus:ring-green-400"
            />
            <div>
              <p className="text-white font-medium">I confirm this PayPal email is verified</p>
              <p className="text-gray-400 text-sm">
                Log into your PayPal account and verify your email address before checking this box. 
                Unverified emails cannot receive payouts.
              </p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !email || !confirmedVerified}
            className="flex-1 py-3 bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Confirm'
            )}
          </button>
          
          {user?.paypal_email && (
            <button
              onClick={handleDisconnect}
              disabled={saving}
              className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-gray-500 text-xs text-center">
            Payouts are processed weekly on Fridays via PayPal.
            <br />
            Minimum payout: 15,000 coins ($50)
          </p>
        </div>
      </div>
    </div>
  )
}
