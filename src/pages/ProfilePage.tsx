import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import { Users, Play, Settings, Plus, Award, Video, Loader2, Check, Camera, Trash2, Key, AlertTriangle, MessageSquare, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

interface Performance {
  id: string
  title: string
  thumbnail: string
  views: number
  date: string
  user_id?: string
  status?: string
}

interface Achievement {
  id: string
  name: string
  icon: string
  date: string
}

export function ProfilePage() {
  const location = useLocation()
  const params = useParams()
  const navigate = useNavigate()
  const { user: storeUser, setUser } = useAppStore()
  const [activeTab, setActiveTab] = useState<'performances' | 'clips' | 'achievements' | 'followers' | 'settings'>('performances')
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [profileUser, setProfileUser] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [performances, setPerformances] = useState<Performance[]>([])
  const [deletingPerfId, setDeletingPerfId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Settings state
  const [sendingTicket, setSendingTicket] = useState(false)
  const [ticketSent, setTicketSent] = useState(false)
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetPasswordEmail, setResetPasswordEmail] = useState('')
  const [resetPasswordSent, setResetPasswordSent] = useState(false)
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    talent_category: '',
    avatar: ''
  })
  
  // Check if this is a new user signup
  const isNewUser = location.state?.isNewUser === true

  // Get the profile ID from URL params or use current user
  const profileId = params.id

  useEffect(() => {
    loadProfile()
  }, [profileId])

  // Populate edit form when profile loads and we're viewing own profile
  useEffect(() => {
    if (profileUser && isOwnProfile && !isEditing) {
      setEditForm({
        username: String(profileUser.username || ''),
        bio: String(profileUser.bio || ''),
        talent_category: String(profileUser.talent_category || ''),
        avatar: String(profileUser.avatar || '')
      })
    }
  }, [profileUser, isOwnProfile, isEditing])

  // Auto-open edit mode for new users
  useEffect(() => {
    if (isNewUser && profileUser) {
      setIsEditing(true)
    }
  }, [isNewUser, profileUser])

  const loadProfile = async () => {
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        // Not logged in, show public profile (or redirect)
        setLoading(false)
        return
      }

      // Determine which profile to load: from URL param or current user
      const targetUserId = profileId || authUser.id
      const isViewingOwnProfile = targetUserId === authUser.id

      // Get user profile from database
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        setLoading(false)
        return
      }

      setProfileUser(profile)
      setIsOwnProfile(isViewingOwnProfile)
      
      // Load user's performances
      if (targetUserId) {
        loadPerformances(targetUserId)
      }
      
      // Only populate edit form if viewing own profile
      if (isViewingOwnProfile) {
        setEditForm({
          username: profile.username || '',
          bio: profile.bio || '',
          talent_category: profile.talent_category || '',
          avatar: profile.avatar || ''
        })

        // Update store
        setUser({
          ...storeUser,
          id: String(profile.id),
          username: String(profile.username || ''),
          avatar: String(profile.avatar || ''),
          bio: String(profile.bio || ''),
          talent_category: String(profile.talent_category || ''),
          followers: Number(profile.followers) || 0,
          following: Number(profile.following) || 0,
          coin_balance: Number(profile.coin_balance) || 0,
          total_earnings: Number(profile.total_earnings) || 0,
          is_admin: Boolean(profile.is_admin),
          is_ceo: Boolean(profile.is_ceo),
          is_verified: Boolean(profile.is_verified),
          is_performer: Boolean(profile.is_performer),
          paypal_email: profile.paypal_email || null,
          paypal_verified: Boolean(profile.paypal_verified),
          created_at: String(profile.created_at || new Date().toISOString())
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPerformances = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('performances')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      if (data) {
        const formattedPerformances: Performance[] = data.map(p => ({
          id: p.id,
          title: p.title || 'Untitled Performance',
          thumbnail: p.thumbnail || p.video_url || `https://picsum.photos/seed/${p.id}/320/180`,
          views: p.views || 0,
          date: p.created_at,
          user_id: p.user_id,
          status: p.status
        }))
        setPerformances(formattedPerformances)
      }
    } catch (error) {
      console.error('Error loading performances:', error)
    }
  }

  const handleDeletePerformance = async (performanceId: string) => {
    if (!confirm('Are you sure you want to permanently delete this performance? This cannot be undone.')) {
      return
    }

    setDeletingPerfId(performanceId)
    try {
      // Hard delete - permanently remove from database
      const { error } = await supabase
        .from('performances')
        .delete()
        .eq('id', performanceId)

      if (error) throw error

      // Also delete from storage if there's a video/thumbnail
      // This would require the storage path, which we'd need to track

      // Update local state
      setPerformances(prev => prev.filter(p => p.id !== performanceId))
    } catch (error) {
      console.error('Error deleting performance:', error)
      alert('Failed to delete performance. Please try again.')
    } finally {
      setDeletingPerfId(null)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not authenticated')

      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get the public URL directly
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Add a cache busting query parameter to ensure the new image is loaded
      const cachedUrl = `${publicUrl}?t=${Date.now()}`

      setEditForm(prev => ({ ...prev, avatar: cachedUrl }))
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Failed to upload avatar. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profileUser) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          username: editForm.username,
          bio: editForm.bio,
          talent_category: editForm.talent_category,
          avatar: editForm.avatar
        })
        .eq('id', profileUser.id)

      if (error) throw error

      // Update local state
      setProfileUser({
        ...profileUser,
        username: editForm.username,
        bio: editForm.bio,
        talent_category: editForm.talent_category,
        avatar: editForm.avatar
      })

      // Update store
      setUser({
        ...storeUser,
        id: storeUser?.id || '',
        username: editForm.username,
        avatar: editForm.avatar,
        bio: editForm.bio,
        talent_category: editForm.talent_category,
        followers: storeUser?.followers || 0,
        following: storeUser?.following || 0,
        coin_balance: storeUser?.coin_balance || 0,
        total_earnings: storeUser?.total_earnings || 0,
        is_admin: storeUser?.is_admin || false,
        is_ceo: storeUser?.is_ceo || false,
        is_verified: storeUser?.is_verified || false,
        is_performer: storeUser?.is_performer || false,
        paypal_email: storeUser?.paypal_email || null,
        paypal_verified: storeUser?.paypal_verified || false,
        created_at: storeUser?.created_at || new Date().toISOString()
      })

      setIsEditing(false)
      
      // For new users, redirect to home after completing profile
      if (isNewUser) {
        navigate('/')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-neon-gold" />
      </div>
    )
  }

  // Profile edit mode
  if (isEditing && isOwnProfile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-neon-gold">
              {isNewUser ? 'Complete Your Profile' : 'Edit Profile'}
            </h2>
            {!isNewUser && (
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {isNewUser && (
            <div className="mb-6 p-4 bg-neon-gold/20 border border-neon-gold/50 rounded-lg">
              <p className="text-neon-gold font-bold">Welcome to Mai Talent! 🎉</p>
              <p className="text-gray-300 text-sm mt-1">
                Please complete your profile to get started. Choose a username and tell us about your talent!
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-neon-gold overflow-hidden bg-gray-700">
                  {editForm.avatar ? (
                    <img 
                      src={editForm.avatar} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <Users className="w-10 h-10 text-gray-500" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-neon-gold rounded-full flex items-center justify-center text-black hover:bg-neon-yellow transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div>
                <p className="text-sm text-gray-400">Profile Photo</p>
                <p className="text-xs text-gray-500">Tap camera to take photo</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username *</label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Your unique username"
                required
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neon-gold focus:outline-none"
                autoComplete="off"
              />
            </div>

            {/* Talent Category */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Talent Category</label>
              <select
                value={editForm.talent_category}
                onChange={(e) => setEditForm(prev => ({ ...prev, talent_category: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neon-gold focus:outline-none"
              >
                <option value="">Select a category</option>
                <option value="Singing">Singing</option>
                <option value="Dancing">Dancing</option>
                <option value="Comedy">Comedy</option>
                <option value="Magic">Magic</option>
                <option value="Variety">Variety Act</option>
                <option value="Instrumental">Instrumental</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself and your talent..."
                rows={4}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white resize-none focus:border-neon-gold focus:outline-none"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveProfile}
              disabled={saving || !editForm.username}
              className="w-full py-3 bg-gradient-to-r from-candy-red to-neon-gold text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {isNewUser ? 'Get Started' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // If no profile data, show placeholder
  if (!profileUser) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
        <p className="text-gray-400">Sign in to view your profile</p>
        <Link to="/auth" className="text-neon-gold hover:underline mt-2 inline-block">
          Sign In
        </Link>
      </div>
    )
  }

  const achievements: Achievement[] = [
    { id: '1', name: 'Top 10 Performer', icon: '🏆', date: '2026-02-01' },
    { id: '2', name: '100K Views', icon: '👁️', date: '2026-01-15' },
    { id: '3', name: 'Verified Artist', icon: '✅', date: '2025-12-01' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-candy-red/30 to-neon-gold/30 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiIC8+PC9zdmc+')] opacity-30"></div>
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 relative z-10">
            <div className="w-24 h-24 rounded-full border-4 border-black overflow-hidden neon-glow-gold bg-gray-700">
              {profileUser?.avatar ? (
                <img 
                  src={String(profileUser.avatar)} 
                  alt={String(profileUser.username || 'User')} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/vite.svg'
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <Users className="w-10 h-10 text-gray-500" />
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-bold">@{String(profileUser?.username || 'User')}</h1>
                {Boolean(profileUser?.is_verified) && <span className="gold-badge">Verified</span>}
              </div>
              <p className="text-neon-yellow">{String(profileUser?.talent_category || 'No category')}</p>
            </div>

            {isOwnProfile && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-neon-gold px-4 py-2 rounded-full flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>

          {/* Bio */}
          <p className="mt-4 text-gray-300 text-center sm:text-left">{String(profileUser?.bio || 'No bio yet')}</p>

          {/* Stats */}
          <div className="flex justify-center sm:justify-start gap-8 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-neon-yellow">{Number(profileUser?.followers || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-400">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{Number(profileUser?.following || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-400">Following</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-candy-red">{Number(profileUser?.total_earnings || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-400">Total Earnings</p>
            </div>
          </div>

          {/* Follow Button */}
          {!isOwnProfile && (
            <div className="flex justify-center sm:justify-start gap-2 mt-4">
              <button className="btn-neon-red px-8 py-2 rounded-full">
                Follow
              </button>
              <button className="glass px-4 py-2 rounded-full hover:bg-white/10">
                Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'performances', label: 'Performances', icon: Play },
          { id: 'clips', label: 'Clips', icon: Video },
          { id: 'achievements', label: 'Achievements', icon: Award },
          { id: 'followers', label: 'Followers', icon: Users },
          ...(isOwnProfile ? [{ id: 'settings', label: 'Settings', icon: Settings }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'btn-neon-red'
                : 'glass hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'performances' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {performances.length > 0 ? (
            performances.map((performance) => (
              <div key={performance.id} className="glass rounded-xl overflow-hidden card-neon-hover relative group">
                <Link to={`/performance/${performance.id}`}>
                  <div className="relative aspect-video">
                    <img
                      src={performance.thumbnail}
                      alt={performance.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="w-12 h-12 text-neon-yellow" fill="currentColor" />
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-white truncate">{performance.title}</h3>
                    <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
                      <span>{performance.views.toLocaleString()} views</span>
                      <span>{new Date(performance.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
                {/* Delete button - only for own profile */}
                {isOwnProfile && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      handleDeletePerformance(performance.id)
                    }}
                    disabled={deletingPerfId === performance.id}
                    className="absolute top-2 right-2 p-2 bg-red-600/80 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete performance"
                  >
                    {deletingPerfId === performance.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-white" />
                    )}
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-400">
              <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No performances yet</p>
            </div>
          )}
          
          {/* Add More */}
          <Link
            to="/audition"
            className="glass rounded-xl aspect-video flex flex-col items-center justify-center text-gray-400 hover:text-neon-yellow transition-colors"
          >
            <Plus className="w-12 h-12 mb-2" />
            <span>Submit Audition</span>
          </Link>
        </div>
      )}

      {activeTab === 'clips' && (
        <div className="text-center py-12 text-gray-400">
          <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No clips yet</p>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="glass rounded-xl p-4 flex items-center gap-4">
              <span className="text-4xl">{achievement.icon}</span>
              <div>
                <h3 className="font-bold text-white">{achievement.name}</h3>
                <p className="text-sm text-gray-400">{new Date(achievement.date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'followers' && (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No followers yet</p>
        </div>
      )}

      {/* Settings Tab - only for own profile */}
      {activeTab === 'settings' && isOwnProfile && (
        <div className="space-y-6">
          {/* Reset Password */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-6 h-6 text-neon-gold" />
              <h3 className="text-xl font-bold text-white">Reset Password</h3>
            </div>
            {!resetPasswordSent ? (
              <div>
                <p className="text-gray-400 mb-4">Enter your email to receive a password reset link.</p>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={resetPasswordEmail}
                    onChange={(e) => setResetPasswordEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neon-gold focus:outline-none"
                  />
                  <button
                    onClick={async () => {
                      if (!resetPasswordEmail) {
                        alert('Please enter your email address')
                        return
                      }
                      setResettingPassword(true)
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(resetPasswordEmail, {
                          redirectTo: `${window.location.origin}/reset-password`
                        })
                        if (error) throw error
                        setResetPasswordSent(true)
                      } catch (err) {
                        console.error('Password reset error:', err)
                        alert('Failed to send reset email. Please try again.')
                      } finally {
                        setResettingPassword(false)
                      }
                    }}
                    disabled={resettingPassword}
                    className="btn-neon-gold px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                  >
                    {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Send Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-green-400 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Password reset link sent! Check your email.
              </div>
            )}
          </div>

          {/* Delete Account */}
          <div className="glass rounded-xl p-6 border border-red-500/30">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-candy-red" />
              <h3 className="text-xl font-bold text-white">Delete Account</h3>
            </div>
            <p className="text-gray-400 mb-4">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-2 bg-candy-red/20 hover:bg-candy-red/40 border border-candy-red text-candy-red rounded-lg font-bold flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete My Account
              </button>
            ) : (
              <div className="bg-candy-red/10 rounded-lg p-4 border border-candy-red/50">
                <p className="text-candy-red font-bold mb-3">Are you sure? This cannot be undone!</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Really delete your account? This is permanent!')) return
                      setDeletingAccount(true)
                      try {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (user) {
                          // Delete user data first
                          await supabase.from('users').delete().eq('id', user.id)
                          // Then sign out
                          await supabase.auth.signOut()
                          navigate('/')
                        }
                      } catch (err) {
                        console.error('Delete account error:', err)
                        alert('Failed to delete account. Please try again.')
                      } finally {
                        setDeletingAccount(false)
                      }
                    }}
                    disabled={deletingAccount}
                    className="px-4 py-2 bg-candy-red text-white rounded-lg font-bold flex items-center gap-2"
                  >
                    {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Yes, Delete Forever
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit Support Ticket */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-neon-purple" />
              <h3 className="text-xl font-bold text-white">Submit Support Ticket</h3>
            </div>
            {!ticketSent ? (
              <div className="space-y-4">
                <p className="text-gray-400">Having issues? Submit a support ticket and our team will help you.</p>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Subject</label>
                  <input
                    type="text"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Brief description of your issue"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neon-purple focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Message</label>
                  <textarea
                    value={ticketForm.message}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white resize-none focus:border-neon-purple focus:outline-none"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!ticketForm.subject || !ticketForm.message) {
                      alert('Please fill in all fields')
                      return
                    }
                    setSendingTicket(true)
                    try {
                      const { data: { user } } = await supabase.auth.getUser()
                      if (!user) throw new Error('Not authenticated')
                      
                      // Get username from profile
                      const { data: profile } = await supabase
                        .from('users')
                        .select('username')
                        .eq('id', user.id)
                        .single()
                      
                      const { error } = await supabase
                        .from('support_tickets')
                        .insert({
                          user_id: user.id,
                          username: profile?.username || 'Unknown',
                          subject: ticketForm.subject,
                          message: ticketForm.message,
                          status: 'open',
                          priority: 'normal'
                        })
                      
                      if (error) throw error
                      setTicketSent(true)
                      setTicketForm({ subject: '', message: '' })
                    } catch (err) {
                      console.error('Submit ticket error:', err)
                      alert('Failed to submit ticket. Please try again.')
                    } finally {
                      setSendingTicket(false)
                    }
                  }}
                  disabled={sendingTicket}
                  className="w-full py-3 bg-neon-purple hover:bg-neon-purple/80 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                >
                  {sendingTicket ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Submit Ticket
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-green-400 font-bold text-lg mb-2">Ticket Submitted!</p>
                <p className="text-gray-400">Our team will review your ticket and get back to you soon.</p>
                <button
                  onClick={() => setTicketSent(false)}
                  className="mt-4 text-neon-purple hover:underline"
                >
                  Submit Another Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
