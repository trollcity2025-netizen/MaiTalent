import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type UserRole = 'ceo' | 'admin' | 'user'

interface UserProfile {
  id: string
  email: string
  username: string
  role: UserRole
  is_ceo: boolean
  is_admin: boolean
  is_performer: boolean
  coin_balance: number
}

export function useUserRole() {
  const [role, setRole] = useState<UserRole>('user')
  const [isCeo, setIsCeo] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setRole('user')
          setIsCeo(false)
          setIsAdmin(false)
          setProfile(null)
          setLoading(false)
          return
        }

        const { data: profileData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error || !profileData) {
          // User profile doesn't exist yet - they need to accept terms
          setRole('user')
          setIsCeo(false)
          setIsAdmin(false)
          setProfile(null)
        } else {
          setProfile(profileData)
          
          if (profileData.is_ceo) {
            setRole('ceo')
            setIsCeo(true)
            setIsAdmin(false)
          } else if (profileData.is_admin) {
            setRole('admin')
            setIsCeo(false)
            setIsAdmin(true)
          } else {
            setRole('user')
            setIsCeo(false)
            setIsAdmin(false)
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setRole('user')
        setIsCeo(false)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Helper functions for role checks
  const canManageAdmins = isCeo
  const canManageUsers = isCeo || isAdmin
  const canManageCoins = isCeo || isAdmin
  const canManagePayouts = isCeo || isAdmin
  const canBanUsers = isCeo || isAdmin
  const canOverrideModeration = isCeo
  const canViewAnalytics = isCeo || isAdmin
  const canEditPlatformSettings = isCeo

  // CEO hierarchy: CEO > ADMIN > USER
  const hasHigherRole = (targetRole: UserRole): boolean => {
    if (role === 'ceo') return true
    if (role === 'admin' && targetRole !== 'ceo') return true
    return false
  }

  return {
    role,
    isCeo,
    isAdmin,
    loading,
    profile,
    canManageAdmins,
    canManageUsers,
    canManageCoins,
    canManagePayouts,
    canBanUsers,
    canOverrideModeration,
    canViewAnalytics,
    canEditPlatformSettings,
    hasHigherRole,
  }
}
