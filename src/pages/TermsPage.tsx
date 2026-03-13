import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check, ChevronDown, Loader2, AlertCircle } from 'lucide-react'
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

const TERMS_VERSION = '1.0.0'

const termsContent = `
1. Platform Description

Mai Talent is an interactive online talent competition platform where users can perform, host, judge, and watch live talent shows.

Users may participate as performers, audience members, judges, or hosts.

By using Mai Talent you agree to follow all platform rules and policies.

2. Age Requirement

Mai Talent is strictly 18 years of age or older.

By creating an account you confirm that:

• You are at least 18 years old.

Accounts found to belong to users under the age of 18 may be permanently suspended or removed from the platform.

3. Coins & Virtual Currency Policy

Mai Talent uses a virtual currency called Coins.

Coins may be purchased to support performers during live shows.

Important policy:

ALL COIN SALES ARE FINAL

NO REFUNDS WILL BE PROVIDED FOR ANY COIN PURCHASES

Coins:

• have no real-world value outside the platform
• cannot be transferred outside the Mai Talent system
• are used only for in-platform features

By purchasing coins you acknowledge that all purchases are final and non-refundable.

4. Earnings & Weekly Payouts

Performers may earn coins through audience support during live talent shows.

Coins earned may be converted into payouts according to the Mai Talent payout system.

Payouts are processed:

Weekly on Fridays.

Mai Talent reserves the right to:

• review accounts for fraud
• delay or cancel payouts for suspicious activity
• suspend accounts violating platform rules

5. Recording & Media Usage Consent

By using Mai Talent you acknowledge and agree that your participation may be recorded during live broadcasts.

This includes:

• video
• audio
• performances
• username and profile information

Mai Talent reserves the right to record, publish, distribute, and promote content created on the platform.

Recorded content may appear on platforms including but not limited to:

• YouTube
• social media platforms
• promotional advertisements
• marketing materials
• other websites and online platforms

By using Mai Talent you GRANT PERMISSION for your performances and broadcasts to be recorded and publicly shared on YouTube and other sites for advertisement and promotional purposes.

You hereby consent to the use of your likeness, voice, performance, and any content you create on the platform for commercial purposes including advertising, marketing, and promotional activities across all media platforms worldwide.

6. Content & Conduct Rules

Users may NOT broadcast or perform content including:

• nudity or sexually explicit content
• hate speech or harassment
• threats or violent behavior
• illegal activity
• copyrighted material without permission
• dangerous or harmful acts

Violations may result in:

• removal from shows
• suspension of accounts
• permanent bans

7. Fraud & Abuse

Mai Talent strictly prohibits:

• fake accounts
• coin fraud
• payout manipulation
• exploiting platform mechanics

Accounts found violating these rules may be permanently banned and may lose earnings.

8. Account Termination

Mai Talent reserves the right to:

• suspend accounts
• remove content
• terminate accounts

for violations of platform policies.

9. Intellectual Property & Copyright

ALL CONTENTS, MATERIALS, AND INTELLECTUAL PROPERTY ON MAI TALENT ARE PROTECTED BY COPYRIGHT AND OTHER INTELLECTUAL PROPERTY LAWS.

IT IS ILLEGAL TO COPY, REPRODUCE, DISTRIBUTE, OR MODIFY ANY CONTENT FROM THIS PLATFORM WITHOUT PRIOR WRITTEN PERMISSION.

This includes but is not limited to:

• videos and live streams
• images and graphics
• audio content
• text and written materials
• software and code
• user interfaces and designs
• logos and branding

Unauthorized copying, reproduction, or distribution of platform content may result in:

• legal action and civil liability
• criminal prosecution under applicable copyright laws
• permanent account termination
• removal of infringing content

Users retain ownership of content they create but grant Mai Talent a license to use, display, and distribute such content as outlined in these terms.

10. Changes to Terms

Mai Talent reserves the right to update these Terms of Service at any time.

Continued use of the platform constitutes acceptance of updated terms.

---

© 2026 Mai Talent. All Rights Reserved.
`

interface SignupData {
  email: string
  password: string
}

export function TermsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [agreed, setAgreed] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [dobError, setDobError] = useState<string | null>(null)
  const [isBanned, setIsBanned] = useState(false)
  const [banReason, setBanReason] = useState<string>('')
  const termsRef = useRef<HTMLDivElement>(null)
  
  // Get signup data from navigation state
  const signupData = location.state as SignupData | null
  const isNewUser = !!signupData?.email

  // Check IP ban on page load
  useEffect(() => {
    const checkBan = async () => {
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipResponse.json()
        const banResult = await checkIPBan(ipData.ip)
        
        if (banResult.banned) {
          setIsBanned(true)
          setBanReason(banResult.reason || 'Your IP address has been banned from this platform.')
        }
      } catch (err) {
        console.warn('Could not check IP ban:', err)
      }
    }

    checkBan()
  }, [])

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (termsRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = termsRef.current
        // Consider scrolled to bottom when within 50px of the end
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
        setHasScrolledToBottom(isAtBottom)
      }
    }

    const termsContainer = termsRef.current
    if (termsContainer) {
      termsContainer.addEventListener('scroll', handleScroll)
      // Check initial position
      handleScroll()
    }

    return () => {
      if (termsContainer) {
        termsContainer.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  const isButtonEnabled = agreed && hasScrolledToBottom

  const handleAccept = async () => {
    if (!isButtonEnabled) return
    
    // Validate date of birth for new users
    if (isNewUser && signupData) {
      // Check DOB format MM-DD-YYYY
      const dobRegex = /^(\d{2})-(\d{2})-(\d{4})$/
      if (!dateOfBirth.match(dobRegex)) {
        setDobError('Please enter your date of birth in format MM-DD-YYYY')
        return
      }
      
      // Parse and validate the date
      const [, month, day, year] = dateOfBirth.match(dobRegex) || []
      const dob = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--
      }
      
      if (age < 18) {
        setDobError('You must be at least 18 years old to use this platform.')
        return
      }
      
      setDobError(null)
    }

    setLoading(true)
    setError(null)

    try {
      // If this is a new user, complete the signup first
      if (isNewUser && signupData) {
        const { error: signupError } = await supabase.auth.signUp({
          email: signupData.email,
          password: signupData.password,
        })
        
        if (signupError) throw signupError
      }
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      if (!user) throw new Error('User not found after signup')

      // Check if user record exists in the users table
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id, username, terms_accepted')
        .eq('id', user.id)
        .single()

      // If no profile exists, create one with default values
      if (!existingProfile) {
        // Extract username from email (part before @)
        const tempUsername = user.email?.split('@')[0] || 'User' + user.id.slice(0, 6)
        
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            username: tempUsername,
            avatar: '',
            bio: '',
            talent_category: '',
            followers: 0,
            following: 0,
            coin_balance: 25,
            total_earnings: 0,
            is_admin: false,
            is_ceo: false,
            is_verified: false,
            is_performer: false,
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            date_of_birth: isNewUser && dateOfBirth ? dateOfBirth : null
          })
        
        if (insertError) {
          console.error('Error creating user profile:', insertError)
          throw insertError
        }
      } else {
        // Update existing profile with terms acceptance
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) throw updateError
      }

      // Record terms acceptance
      const { error: insertError } = await supabase
        .from('terms_acceptances')
        .insert({
          user_id: user.id,
          terms_version: TERMS_VERSION,
          ip_address: await getClientIP(),
        })

      if (insertError) console.log('Terms acceptance log error (non-critical):', insertError)

      // Check if this is a new user signup - redirect to profile edit
      if (isNewUser && signupData) {
        // For new users, redirect to profile page to complete their profile
        navigate('/profile', { state: { isNewUser: true } })
      } else {
        // For existing users, redirect to home
        navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Helper to get client IP (simplified - in production use a proper service)
  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch {
      return 'unknown'
    }
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

      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black shimmer-gold">Mai Talent</h1>
          <h2 className="text-xl font-bold text-white mt-2">Terms of Service & User Agreement</h2>
          <p className="text-gray-400 mt-2">
            {isNewUser 
              ? 'You must accept our terms to create an account.'
              : 'By creating an account and using Mai Talent, you agree to the following rules, policies, and terms.'
            }
          </p>
        </div>

        {/* Terms Container */}
        <div 
          ref={termsRef}
          className="flex-1 overflow-y-auto glass rounded-2xl p-6 mb-6"
          style={{ maxHeight: '50vh' }}
        >
          <div className="prose prose-invert max-w-none">
            {termsContent.split('\n').map((line, i) => {
              if (line.trim() === '') return <br key={i} />
              if (line.match(/^\d+\./)) {
                return (
                  <h3 key={i} className="text-lg font-bold text-neon-gold mt-6 mb-3">
                    {line}
                  </h3>
                )
              }
              if (line.startsWith('•')) {
                return (
                  <li key={i} className="text-gray-300 ml-4">
                    {line.substring(1).trim()}
                  </li>
                )
              }
              if (line.match(/^(ALL CAPS|No Refunds)/i)) {
                return (
                  <p key={i} className="text-candy-red font-bold my-2">
                    {line}
                  </p>
                )
              }
              return (
                <p key={i} className="text-gray-300 mb-2">
                  {line}
                </p>
              )
            })}
          </div>
          
          {/* Scroll indicator */}
          {!hasScrolledToBottom && (
            <div className="sticky bottom-0 flex items-center justify-center gap-2 text-gray-500 py-2 bg-gradient-to-t from-black">
              <ChevronDown className="w-5 h-5 animate-bounce" />
              <span className="text-sm">Scroll to bottom</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        {/* Date of Birth Input for New Users */}
        {isNewUser && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date of Birth *
            </label>
            <input
              type="text"
              value={dateOfBirth}
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
                  setDateOfBirth(value)
                }
                setDobError(null)
              }}
              placeholder="MM-DD-YYYY"
              maxLength={10}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neon-gold focus:outline-none"
            />
            {dobError && (
              <p className="text-red-400 text-sm mt-1">{dobError}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              You must be 18 or older to use this platform. Format: MM-DD-YYYY
            </p>
          </div>
        )}

        {/* Checkbox */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <div 
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                  agreed 
                    ? 'bg-neon-gold border-neon-gold' 
                    : 'border-gray-500 bg-transparent'
                }`}
              >
                {agreed && <Check className="w-4 h-4 text-black" />}
              </div>
            </div>
            <span className="text-gray-300 text-sm">
              I have read and agree to the Mai Talent Terms of Service and Policies.
            </span>
          </label>
        </div>

        {/* Accept Button */}
        <button
          onClick={handleAccept}
          disabled={!isButtonEnabled || loading}
          className={`w-full py-4 font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            isButtonEnabled
              ? 'bg-gradient-to-r from-candy-red to-neon-gold text-white hover:opacity-90 hover:shadow-lg hover:shadow-candy-red/50'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            'Accept & Continue'
          )}
        </button>

        {/* Progress indicator */}
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${hasScrolledToBottom ? 'bg-green-500' : 'bg-gray-600'}`} />
            <span className={hasScrolledToBottom ? 'text-green-400' : 'text-gray-500'}>
              Scroll to bottom
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${agreed ? 'bg-green-500' : 'bg-gray-600'}`} />
            <span className={agreed ? 'text-green-400' : 'text-gray-500'}>
              Agree to terms
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
