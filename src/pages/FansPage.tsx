import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Users, Loader2, UserPlus, UserMinus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { useFollowers, useFollowing, useFollow } from '../hooks/useUserFollows'

export function FansPage() {
  const { user: storeUser } = useAppStore()
  const { tab } = useParams<{ tab?: string }>()
  const activeTab = tab || 'followers'
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        // If no specific user is being viewed, view own profile
        setViewingUserId(storeUser?.id || user.id)
      }
    }
    getCurrentUser()
  }, [storeUser])

  // Get followers and following data
  const { followers, loading: followersLoading } = useFollowers(viewingUserId)
  const { following, loading: followingLoading } = useFollowing(viewingUserId)
  const { toggleFollow, loading: followLoading } = useFollow()

  // Get current user's follow status for each person
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUserId) return
      
      const allUsers = activeTab === 'followers' ? followers : following
      const status: Record<string, boolean> = {}
      
      for (const u of allUsers) {
        if (u.id !== currentUserId) {
          const { data } = await supabase
            .from('user_follows')
            .select('id')
            .eq('follower_id', currentUserId)
            .eq('following_id', u.id)
            .single()
          status[u.id] = !!data
        }
      }
      
      setFollowingStatus(status)
    }

    checkFollowStatus()
  }, [currentUserId, activeTab, followers, following])

  const isOwnProfile = viewingUserId === currentUserId

  if (followersLoading || followingLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-neon-gold" />
      </div>
    )
  }

  const displayUsers = activeTab === 'followers' ? followers : following

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neon-gold shimmer-gold">
          {isOwnProfile ? 'My Fans' : `@${displayUsers[0]?.username || 'User'}'s Fans`}
        </h1>
        <p className="text-gray-400 mt-1">
          {isOwnProfile 
            ? 'People who follow you and people you follow' 
            : 'Followers and following'
          }
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Link
          to="/fans/followers"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'followers'
              ? 'bg-candy-red text-white'
              : 'glass hover:bg-white/10'
          }`}
        >
          <Users className="w-4 h-4" />
          Followers ({followers.length})
        </Link>
        <Link
          to="/fans/following"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'following'
              ? 'bg-candy-red text-white'
              : 'glass hover:bg-white/10'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Following ({following.length})
        </Link>
      </div>

      {/* Users List */}
      {displayUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">
            {activeTab === 'followers' 
              ? 'No followers yet' 
              : "You're not following anyone yet"
            }
          </p>
          {activeTab === 'following' && (
            <Link to="/" className="text-neon-gold hover:underline mt-2 inline-block">
              Discover performers
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {displayUsers.map((user) => (
            <div
              key={user.id}
              className="glass rounded-xl p-4 flex items-center justify-between"
            >
              <Link
                to={`/profile/${user.id}`}
                className="flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      👤
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-white">@{user.username}</p>
                  <p className="text-sm text-gray-400">
                    Following since {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
              
              {/* Follow/Unfollow Button - Don't show for self */}
              {currentUserId && currentUserId !== user.id && (
                <button
                  onClick={() => toggleFollow(user.id, followingStatus[user.id] || false)}
                  disabled={followLoading}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                    followingStatus[user.id]
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-candy-red hover:bg-red-600 text-white'
                  }`}
                >
                  {followLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : followingStatus[user.id] ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Follow
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FansPage
