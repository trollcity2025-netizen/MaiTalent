import { useState, useEffect, useCallback } from 'react'
import { supabase, type PerformerApplication } from '../lib/supabase'

// ============================================
// FOLLOW SYSTEM HOOKS
// ============================================

interface FollowStats {
  followers: number
  following: number
}

export function useFollowStats(userId: string | null) {
  const [stats, setStats] = useState<FollowStats>({ followers: 0, following: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchStats = async () => {
      try {
        const { data: user } = await supabase
          .from('users')
          .select('followers, following')
          .eq('id', userId)
          .single()

        if (user) {
          setStats({
            followers: user.followers || 0,
            following: user.following || 0,
          })
        }
      } catch (error) {
        console.error('Error fetching follow stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userId])

  return { stats, loading }
}

export function useIsFollowing(targetUserId: string | null, refreshKey?: number) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false)
      return
    }

    const checkFollow = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .single()

        setIsFollowing(!!data)
      } catch {
        setIsFollowing(false)
      } finally {
        setLoading(false)
      }
    }

    checkFollow()
  }, [targetUserId, refreshKey])

  return { isFollowing, loading }
}

export function useFollow() {
  const [loading, setLoading] = useState(false)
  const [followState, setFollowState] = useState<Record<string, boolean>>({})

  const follow = useCallback(async (targetUserId: string): Promise<boolean> => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('follow_user', {
        p_follower_id: user.id,
        p_following_id: targetUserId,
      })

      if (error) throw error
      
      // Update local state immediately
      setFollowState(prev => ({ ...prev, [targetUserId]: true }))
      return true
    } catch (error) {
      console.error('Error following user:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const unfollow = useCallback(async (targetUserId: string): Promise<boolean> => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('unfollow_user', {
        p_follower_id: user.id,
        p_following_id: targetUserId,
      })

      if (error) throw error
      
      // Update local state immediately
      setFollowState(prev => ({ ...prev, [targetUserId]: false }))
      return true
    } catch (error) {
      console.error('Error unfollowing user:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleFollow = useCallback(async (targetUserId: string, currentlyFollowing: boolean): Promise<boolean> => {
    if (currentlyFollowing) {
      return unfollow(targetUserId)
    } else {
      return follow(targetUserId)
    }
  }, [follow, unfollow])

  const getFollowState = useCallback((targetUserId: string): boolean | undefined => {
    return followState[targetUserId]
  }, [followState])

  return { follow, unfollow, toggleFollow, loading, getFollowState }
}

// ============================================
// BLOCK SYSTEM HOOKS
// ============================================

export function useIsBlocked(targetUserId: string | null) {
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false)
      return
    }

    const checkBlock = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data } = await supabase
          .from('blocked_users')
          .select('id')
          .eq('blocker_id', user.id)
          .eq('blocked_id', targetUserId)
          .single()

        setIsBlocked(!!data)
      } catch {
        setIsBlocked(false)
      } finally {
        setLoading(false)
      }
    }

    checkBlock()
  }, [targetUserId])

  return { isBlocked, loading }
}

export function useBlock() {
  const [loading, setLoading] = useState(false)

  const block = useCallback(async (targetUserId: string, reason?: string): Promise<boolean> => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('block_user', {
        p_blocker_id: user.id,
        p_blocked_id: targetUserId,
        p_reason: reason || null,
      })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error blocking user:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const unblock = useCallback(async (targetUserId: string): Promise<boolean> => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetUserId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error unblocking user:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { block, unblock, loading }
}

// ============================================
// REPORT SYSTEM HOOKS
// ============================================

export function useReport() {
  const [loading, setLoading] = useState(false)

  const report = useCallback(async (
    reportedUserId: string,
    reportType: 'spam' | 'harassment' | 'inappropriate' | 'fake_account' | 'other',
    description?: string
  ): Promise<boolean> => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: user.id,
          reported_id: reportedUserId,
          report_type: reportType,
          description: description || null,
          status: 'pending',
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error reporting user:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { report, loading }
}

// ============================================
// PERFORMER APPLICATION HOOKS
// ============================================

export function usePerformerApplication() {
  const [application, setApplication] = useState<PerformerApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [canResubmit, setCanResubmit] = useState(true)

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data } = await supabase
          .from('performer_applications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        setApplication(data || null)

        // Check resubmission eligibility
        if (data && data.status === 'denied') {
          const { data: resubmitData } = await supabase.rpc('can_resubmit_performer_application', {
            p_user_id: user.id,
          })
          setCanResubmit(resubmitData || false)
        } else {
          setCanResubmit(!data || data.status !== 'approved')
        }
      } catch (error) {
        console.error('Error fetching application:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchApplication()
  }, [])

  const submitApplication = useCallback(async (data: {
    full_name: string
    date_of_birth: string
    email: string
    phone?: string
    talent_category: string
    bio?: string
    video_url?: string
    availability?: string
    paypal_email: string
  }): Promise<boolean> => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check resubmission eligibility
      const { data: resubmitData } = await supabase.rpc('can_resubmit_performer_application', {
        p_user_id: user.id,
      })

      if (!resubmitData) {
        throw new Error('You must wait 48 hours before resubmitting your application')
      }

      const { error } = await supabase
        .from('performer_applications')
        .insert({
          user_id: user.id,
          full_name: data.full_name,
          date_of_birth: data.date_of_birth,
          email: data.email,
          phone: data.phone || null,
          talent_category: data.talent_category,
          bio: data.bio || null,
          video_url: data.video_url || null,
          availability: data.availability || null,
          paypal_email: data.paypal_email,
          status: 'pending',
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error submitting application:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { application, loading, canResubmit, submitApplication }
}

// ============================================
// GET FOLLOWERS/FOLLOWING LIST HOOKS
// ============================================

export function useFollowers(userId: string | null) {
  const [followers, setFollowers] = useState<Array<{
    id: string
    username: string
    avatar: string
    created_at: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchFollowers = async () => {
      try {
        // Get follower IDs
        const { data: follows } = await supabase
          .from('user_follows')
          .select('follower_id, created_at')
          .eq('following_id', userId)

        if (!follows || follows.length === 0) {
          setFollowers([])
          setLoading(false)
          return
        }

        const followerIds = follows.map(f => f.follower_id)

        // Get user details
        const { data: users } = await supabase
          .from('users')
          .select('id, username, avatar')
          .in('id', followerIds)

        // Merge with follow data
        const followersWithDate = follows.map(f => {
          const user = users?.find(u => u.id === f.follower_id)
          return {
            id: f.follower_id,
            username: user?.username || 'Unknown',
            avatar: user?.avatar || '',
            created_at: f.created_at,
          }
        })

        setFollowers(followersWithDate)
      } catch (error) {
        console.error('Error fetching followers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFollowers()
  }, [userId])

  return { followers, loading }
}

export function useFollowing(userId: string | null) {
  const [following, setFollowing] = useState<Array<{
    id: string
    username: string
    avatar: string
    created_at: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchFollowing = async () => {
      try {
        // Get following IDs
        const { data: follows } = await supabase
          .from('user_follows')
          .select('following_id, created_at')
          .eq('follower_id', userId)

        if (!follows || follows.length === 0) {
          setFollowing([])
          setLoading(false)
          return
        }

        const followingIds = follows.map(f => f.following_id)

        // Get user details
        const { data: users } = await supabase
          .from('users')
          .select('id, username, avatar')
          .in('id', followingIds)

        // Merge with follow data
        const followingWithDate = follows.map(f => {
          const user = users?.find(u => u.id === f.following_id)
          return {
            id: f.following_id,
            username: user?.username || 'Unknown',
            avatar: user?.avatar || '',
            created_at: f.created_at,
          }
        })

        setFollowing(followingWithDate)
      } catch (error) {
        console.error('Error fetching following:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFollowing()
  }, [userId])

  return { following, loading }
}
