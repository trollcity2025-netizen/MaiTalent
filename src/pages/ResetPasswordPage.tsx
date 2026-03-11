import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

// IP Ban check function
async function checkIPBan(ipAddress: string): Promise<{ banned: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase
      .from('banned_ips')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking IP ban:', error);
      return { banned: false };
    }

    if (data) {
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { banned: false };
      }
      return { banned: true, reason: data.reason };
    }

    return { banned: false };
  } catch (err) {
    console.error('IP ban check error:', err);
    return { banned: false };
  }
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isBanned, setIsBanned] = useState(false)
  const [banReason, setBanReason] = useState<string>('')
  
  // Form states
  const [dob, setDob] = useState('')
  const [dobError, setDobError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Check IP ban and session on page load
  useEffect(() => {
    const initializePage = async () => {
      // First check IP ban
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipResponse.json()
        const banResult = await checkIPBan(ipData.ip)
        
        if (banResult.banned) {
          setIsBanned(true)
          setBanReason(banResult.reason || 'Your IP address has been banned from this platform.')
          setLoading(false)
          return
        }
      } catch (err) {
        console.warn('Could not check IP ban:', err)
      }

      // Then check session
      try {
        const hash = window.location.hash
        
        // Check if we have reset tokens in the URL
        if (hash.includes('access_token') || hash.includes('type=recovery')) {
          // Extract tokens from hash
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (accessToken && refreshToken) {
            // Set the session from the tokens in the URL
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            
            if (error) {
              console.error('Error setting session:', error)
              setError('Invalid or expired reset link. Please request a new password reset.')
            }
          }
        }
        
        // Check if user is logged in (session created by Supabase)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('Please use the password reset link from your email.')
        }
      } catch (err) {
        console.error('Error initializing page:', err)
      } finally {
        setLoading(false)
      }
    }
    
    initializePage()
  }, [])

  const handleVerifyDOB = async () => {
    if (!dob.trim()) {
      setDobError('Please enter your date of birth')
      return
    }
    
    // Check DOB format MM-DD-YYYY
    const dobRegex = /^(\d{2})-(\d{2})-(\d{4})$/
    if (!dob.match(dobRegex)) {
      setDobError('Please enter your date of birth in format MM-DD-YYYY')
      return
    }
    
    setVerifying(true)
    setDobError(null)
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setDobError('Session expired. Please request a new password reset link.')
        return
      }
      
      // Get user's stored DOB from database
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('date_of_birth, email')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        console.error('Error fetching profile:', profileError)
        setDobError('Unable to verify. Please contact support.')
        return
      }
      
      // Compare DOB
      // Normalize both dates for comparison (remove time component)
      const inputDob = dob.trim().toLowerCase()
      const storedDob = profile.date_of_birth ? profile.date_of_birth.trim().toLowerCase() : ''
      
      if (inputDob !== storedDob) {
        setDobError('Date of birth does not match our records. Please try again.')
        return
      }
      
      // DOB verified!
      setIsVerified(true)
    } catch (err) {
      console.error('DOB verification error:', err)
      setDobError('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleChangePassword = async () => {
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    setChangingPassword(true)
    setError(null)
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })
      
      if (updateError) throw updateError
      
      setSuccess('Password updated successfully! Redirecting to login...')
      
      // Sign out and redirect to login after a delay
      setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/login')
      }, 2000)
    } catch (err) {
      console.error('Password update error:', err)
      setError('Failed to update password. Please try again.')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="animate-pulse text-neon-gold">Verifying...</div>
      </div>
    )
  }

  // Show banned message if IP is banned
  if (isBanned) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-400 max-w-md">{banReason}</p>
          <p className="text-gray-500 text-sm mt-4">Please contact support if you believe this is an error.</p>
        </div>
      </div>
    )
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
          <p className="text-gray-400 mt-2">
            {isVerified ? 'Create New Password' : 'Verify Your Identity'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {isVerified ? 'New Password' : 'Reset Password'}
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

          {!isVerified ? (
            /* DOB Verification Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date of Birth
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={dob}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9-]/g, '')
                      // Auto-add dashes
                      if (value.length === 2 && !value.includes('-')) {
                        value = value + '-'
                      }
                      if (value.length === 5 && value.split('-').length === 2) {
                        value = value + '-'
                      }
                      // Limit to 10 characters
                      if (value.length <= 10) {
                        setDob(value)
                      }
                      setDobError(null)
                    }}
                    placeholder="MM-DD-YYYY"
                    maxLength={10}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-gold"
                  />
                </div>
                {dobError && (
                  <p className="text-red-400 text-sm mt-1">{dobError}</p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  Enter your date of birth in format MM-DD-YYYY to verify your identity
                </p>
              </div>

              <button
                onClick={handleVerifyDOB}
                disabled={verifying}
                className="w-full py-3 bg-gradient-to-r from-candy-red to-neon-gold text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying && <Loader2 className="w-5 h-5 animate-spin" />}
                Verify Identity
              </button>
            </div>
          ) : (
            /* Password Change Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm New Password
                </label>
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

              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="w-full py-3 bg-gradient-to-r from-candy-red to-neon-gold text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {changingPassword && <Loader2 className="w-5 h-5 animate-spin" />}
                Change Password
              </button>
            </div>
          )}
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

export default ResetPasswordPage
