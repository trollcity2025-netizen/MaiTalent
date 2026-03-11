import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password'

export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Check if user is already logged in and has accepted terms
  // Only redirect if user is logged in and trying to access auth page (not for signup flow)
  useEffect(() => {
    const checkUser = async () => {
      // Skip check if this is the initial load - let the form render first
      const { data: { user }, error } = await supabase.auth.getUser()
      
      // Only redirect if there's an actual user and no errors
      if (user && !error) {
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('terms_accepted')
            .eq('id', user.id)
            .single()
          
          // Only redirect if profile exists AND terms not accepted
          // Don't redirect new users without profiles - they should see the auth form
          if (profile && !profile?.terms_accepted) {
            navigate('/terms')
          } else if (profile && profile?.terms_accepted) {
            // User is logged in and has accepted terms, redirect to home
            navigate('/')
          }
          // If no profile exists, let user see the auth form
        } catch {
          // If profile query fails, don't redirect - let user see auth form
          console.log('Profile query failed, showing auth form')
        }
      }
      // If no user, show auth form - this is the correct behavior for new users
    }
    
    // Add a small delay to prevent race conditions with initial render
    const timer = setTimeout(() => {
      checkUser()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        
        // Check if user has accepted terms after login
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('terms_accepted')
            .eq('id', user.id)
            .single()
          
          if (!profile?.terms_accepted) {
            navigate('/terms')
          } else {
            navigate('/')
          }
        } else {
          navigate('/')
        }
      } else if (mode === 'signup') {
        // Redirect to terms page for new users
        navigate('/terms', { state: { email, password } })
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset-password`,
        })
        if (error) throw error
        setSuccess('Password reset link sent! Check your email.')
      } else if (mode === 'reset-password') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        const { error } = await supabase.auth.updateUser({
          password,
        })
        if (error) throw error
        setSuccess('Password updated! Redirecting to login...')
        setTimeout(() => {
          setMode('login')
          setPassword('')
          setConfirmPassword('')
        }, 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError(null)
    setSuccess(null)
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-candy-red/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-gold/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-candy-red to-neon-gold mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black shimmer-gold">MaiTalent</h1>
          <p className="text-gray-400 mt-2">Share your talent with the world</p>
        </div>

        {/* Auth Card */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot-password' && 'Reset Password'}
            {mode === 'reset-password' && 'New Password'}
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-green-400 text-sm">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            {mode !== 'reset-password' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-gold"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            {(mode === 'login' || mode === 'signup' || mode === 'reset-password') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {mode === 'reset-password' ? 'New Password' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-gold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-gold"
                  />
                </div>
              </div>
            )}

            {/* Forgot Password Link */}
            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => toggleMode('forgot-password')}
                  className="text-sm text-neon-gold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-candy-red to-neon-gold text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot-password' && 'Send Reset Link'}
              {mode === 'reset-password' && 'Update Password'}
            </button>
          </form>

          {/* Divider */}
          {mode === 'login' && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
            </div>
          )}

          {/* Mode Switch */}
          <div className="mt-6 text-center text-gray-400">
            {mode === 'login' && (
              <>
                Don't have an account?{' '}
                <button onClick={() => toggleMode('signup')} className="text-neon-gold hover:underline">
                  Sign up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                Already have an account?{' '}
                <button onClick={() => toggleMode('login')} className="text-neon-gold hover:underline">
                  Sign in
                </button>
              </>
            )}
            {mode === 'forgot-password' && (
              <>
                Remember your password?{' '}
                <button onClick={() => toggleMode('login')} className="text-neon-gold hover:underline">
                  Sign in
                </button>
              </>
            )}
            {mode === 'reset-password' && (
              <>
                Need a new reset link?{' '}
                <button onClick={() => toggleMode('forgot-password')} className="text-neon-gold hover:underline">
                  Request new link
                </button>
              </>
            )}
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-gray-500 hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
