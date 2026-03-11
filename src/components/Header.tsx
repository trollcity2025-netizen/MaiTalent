import { Link, useNavigate } from 'react-router-dom'
import { Search, Bell, User, Settings, LogOut, LogIn, Star, Crown } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { JudgeApplicationModal } from './JudgeApplicationModal'
import { HostApplicationModal } from './HostApplicationModal'
import type { User as SupabaseUser } from '../lib/supabase'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string
  is_read: boolean
  created_at: string
}

export function Header() {
  const { user, toggleSidebar, logout, setUser } = useAppStore()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showJudgeApplication, setShowJudgeApplication] = useState(false)
  const [showHostApplication, setShowHostApplication] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  
  // Search state
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<{id: string, username: string, avatar: string}>>([])
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Listen for auth state changes
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch user profile from users table
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUser(data as SupabaseUser)
            }
          })
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUser(data as SupabaseUser)
            }
          })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser])

  // Fetch notifications
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) {
      setNotifications([])
      return
    }

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      setNotifications(data || [])
    }

    fetchNotifications()

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
  }

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  // Live search effect - fetch results after 3 characters
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length >= 3) {
        setSearching(true)
        setShowSearchResults(true)
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, username, avatar')
            .ilike('username', `${searchQuery}%`)
            .limit(10)

          if (error) throw error
          setSearchResults(data || [])
        } catch (err) {
          console.error('Search error:', err)
          setSearchResults([])
        } finally {
          setSearching(false)
        }
      } else {
        setShowSearchResults(false)
        setSearchResults([])
      }
    }

    const debounce = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/')
    setShowDropdown(false)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return '👤'
      case 'message':
        return '💬'
      case 'gift':
        return '🎁'
      case 'vote':
        return '👍'
      case 'judge':
        return '⭐'
      default:
        return '🔔'
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-dark border-b border-red-900/30">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left - Logo */}
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="w-6 h-5 flex flex-col justify-between">
                <span className="block h-0.5 w-full bg-neon-yellow"></span>
                <span className="block h-0.5 w-full bg-neon-yellow"></span>
                <span className="block h-0.5 w-full bg-neon-yellow"></span>
              </div>
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                <img 
                  src="/maitalentlogo.png" 
                  alt="MAI Talent" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-2xl font-bold shimmer-gold hidden sm:block">MAI Talent</span>
            </Link>
          </div>

          {/* Center - Search */}
          <div className="flex-1 max-w-xl mx-8 hidden md:block" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search shows, performers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 3 && setShowSearchResults(true)}
                  className="w-full h-10 pl-10 pr-4 rounded-full input-neon"
                />
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden z-50 max-h-80 overflow-y-auto">
                  {searching ? (
                    <div className="p-4 text-center text-gray-400">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div>
                      {searchResults.map(result => (
                        <button
                          key={result.id}
                          onClick={() => {
                            navigate(`/profile/${result.id}`)
                            setShowSearchResults(false)
                            setSearchQuery('')
                          }}
                          className="w-full p-3 flex items-center gap-3 hover:bg-gray-800 transition-colors border-b border-gray-800"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                            {result.avatar ? (
                              <img src={result.avatar} alt={result.username} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <span className="text-white">{result.username}</span>
                        </button>
                      ))}
                      {searchQuery.length >= 3 && (
                        <button
                          type="submit"
                          className="w-full p-3 text-center text-neon-yellow hover:bg-gray-800 transition-colors border-t border-gray-700"
                        >
                          View all results for "{searchQuery}"
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-400">
                      No results found
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            {user && (
              <>
                <button
                  onClick={() => setShowJudgeApplication(true)}
                  className="btn-neon-purple px-4 py-2 rounded-full flex items-center gap-2 text-sm"
                >
                  <Star className="w-4 h-4" />
                  <span className="hidden sm:inline">Judge</span>
                </button>
                <button
                  onClick={() => setShowHostApplication(true)}
                  className="btn-neon-gold px-4 py-2 rounded-full flex items-center gap-2 text-sm"
                >
                  <Crown className="w-4 h-4" />
                  <span className="hidden sm:inline">Host</span>
                </button>
              </>
            )}

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Bell className="w-6 h-6 text-neon-yellow" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-candy-red text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 glass-dark rounded-lg overflow-hidden neon-border-gold max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-neon-yellow">Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map(notification => (
                        <button
                          key={notification.id}
                          onClick={() => {
                            markAsRead(notification.id)
                            if (notification.link) {
                              navigate(notification.link)
                            }
                            setShowNotifications(false)
                          }}
                          className={`w-full p-3 flex items-start gap-3 hover:bg-white/5 transition-colors border-b border-white/5 ${
                            !notification.is_read ? 'bg-candy-red/10' : ''
                          }`}
                        >
                          <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 text-left">
                            <p className={`text-sm ${!notification.is_read ? 'text-white font-medium' : 'text-gray-300'}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-400">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatTime(notification.created_at)}</p>
                          </div>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-neon-yellow rounded-full mt-2"></span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              {user ? (
                <>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full avatar-ring flex items-center justify-center overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-neon-yellow" />
                      )}
                    </div>
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-48 glass-dark rounded-lg overflow-hidden neon-border-gold">
                      <div className="p-3 border-b border-white/10">
                        <p className="font-bold text-neon-yellow">{user?.username || 'Guest'}</p>
                        <p className="text-xs text-gray-400">{user?.talent_category || 'Viewer'}</p>
                      </div>
                      <div className="py-2">
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors"
                          onClick={() => setShowDropdown(false)}
                        >
                          <User className="w-4 h-4" />
                          <span>Profile</span>
                        </Link>
                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors"
                          onClick={() => setShowDropdown(false)}
                        >
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </Link>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors text-candy-red"
                          onClick={handleLogout}
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to="/auth"
                  className="btn-neon-gold px-4 py-2 rounded-full flex items-center gap-2 text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      <JudgeApplicationModal
        isOpen={showJudgeApplication}
        onClose={() => setShowJudgeApplication(false)}
        userId={user?.id || ''}
      />
      <HostApplicationModal
        isOpen={showHostApplication}
        onClose={() => setShowHostApplication(false)}
        userId={user?.id || ''}
      />
    </>
  )
}
