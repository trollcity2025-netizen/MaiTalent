import { Link, useLocation } from 'react-router-dom'
import { Home, Radio, Tv, Mic, Trophy, Settings, ChevronLeft, ChevronRight, ShoppingBag, CreditCard, MessageCircle, Shield, Crown, DollarSign, Check, Calendar } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useUserRole } from '../hooks/useUserRole'
import { useState, useRef, useEffect } from 'react'
import { useLiveShows } from '../hooks/useSupabaseData'

const adminNavItems = [
  { path: '/admin', icon: Shield, label: 'Admin Dashboard', highlight: true },
]

// Static nav items (without Live Now which needs dynamic routing)
const staticNavItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/shows', icon: Tv, label: '📺 Shows' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/auditions', icon: Mic, label: 'Auditions' },
  { path: '/competition', icon: Trophy, label: '🏆 Competition' },
  { path: '/champions', icon: Crown, label: '👑 Hall of Champions' },
  { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { path: '/chats', icon: MessageCircle, label: '⭐ Mai Chats', highlight: true },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar, setStoreOpen, coins, user, setPaypalModalOpen, setPayoutOpen } = useAppStore()
  const { isAdmin, isCeo } = useUserRole()
  const { shows: liveShows } = useLiveShows()
  const showAdminLink = isAdmin || isCeo
  
  // Build nav items with dynamic Live Now link
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: liveShows[0] ? `/show/${liveShows[0].id}` : '/show/preview', icon: Radio, label: '🔴 Live Now' },
    ...staticNavItems.slice(1),
  ]
  
  const [walletMenuOpen, setWalletMenuOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const walletMenuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target as Node)) {
        setWalletMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleWalletClick = () => {
    if (sidebarCollapsed) {
      // If collapsed, just open the store
      setStoreOpen(true)
    } else {
      // If expanded, show the dropdown menu
      setWalletMenuOpen(!walletMenuOpen)
    }
  }

  const handleStoreClick = () => {
    setStoreOpen(true)
    setWalletMenuOpen(false)
  }

  const handlePayoutClick = () => {
    setPayoutOpen(true)
    setWalletMenuOpen(false)
  }

  const handlePayPalClick = () => {
    setPaypalModalOpen(true)
    setWalletMenuOpen(false)
  }

  return (
    <aside
      className={`fixed left-0 top-16 bottom-0 z-40 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="h-full glass-dark border-r border-red-900/30 flex flex-col">
        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-candy-red flex items-center justify-center hover:neon-glow-red transition-all"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const showNotes = isActive || hoveredItem === item.path
              return (
                <li key={item.path}
                    className="sidebar-nav-item"
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? item.highlight
                          ? 'bg-neon-yellow/20 text-neon-yellow neon-glow-yellow'
                          : 'bg-candy-red/20 text-neon-yellow neon-border-gold'
                        : 'text-gray-300 hover:bg-white/5 hover:text-neon-yellow hover:neon-glow-yellow'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-neon-yellow' : ''}`} />
                    {!sidebarCollapsed && (
                      <span className="font-medium">{item.label}</span>
                    )}
                    {isActive && !sidebarCollapsed && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-neon-yellow neon-shimmer"></span>
                    )}
                    {/* Musical Notes Animation */}
                    {showNotes && !sidebarCollapsed && (
                      <div className="musical-notes-container">
                        <span className="musical-note" style={{ color: '#ffd700' }}>♪</span>
                        <span className="musical-note" style={{ color: '#ff6b6b' }}>♫</span>
                        <span className="musical-note" style={{ color: '#ffd700' }}>♪</span>
                        <span className="musical-note" style={{ color: '#ff6b6b' }}>♫</span>
                      </div>
                    )}
                  </Link>
                </li>
              )
            })}
            
            {/* Admin Link - Only visible to admins and CEOs */}
            {showAdminLink && adminNavItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <li key={item.path} className="mt-4 pt-4 border-t border-white/10">
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-neon-yellow/20 text-neon-yellow neon-glow-yellow'
                        : 'text-gray-300 hover:bg-white/5 hover:text-neon-yellow hover:neon-glow-yellow'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-neon-yellow' : ''}`} />
                    {!sidebarCollapsed && (
                      <span className="font-medium">{item.label}</span>
                    )}
                    {isActive && !sidebarCollapsed && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-neon-yellow neon-shimmer"></span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-white/10 space-y-3" ref={walletMenuRef}>
            {/* Combined Wallet Button */}
            <div className="relative">
              <button
                onClick={handleWalletClick}
                className="w-full glass-gold rounded-lg p-3 hover:border-neon-yellow/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-neon-gold">Wallet</span>
                  <ShoppingBag className="w-4 h-4 text-neon-gold" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-neon-yellow">{coins.toLocaleString()}</span>
                    <span className="text-xs text-gray-400">coins</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <CreditCard className="w-3 h-3" />
                    <span>Payout</span>
                  </div>
                </div>
                
                {/* PayPal Status */}
                {user && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-blue-400" />
                        <span className="text-gray-400">PayPal:</span>
                      </div>
                      {user.paypal_email ? (
                        <div className="flex items-center gap-1">
                          {user.paypal_verified ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" />
                              <span className="text-green-400">Verified</span>
                            </>
                          ) : (
                            <span className="text-orange-400">Unverified</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Not connected</span>
                      )}
                    </div>
                    {user.paypal_email && (
                      <p className="text-gray-500 text-xs mt-1 truncate">{user.paypal_email}</p>
                    )}
                  </div>
                )}
              </button>

              {/* Wallet Dropdown Menu */}
              {walletMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg overflow-hidden shadow-xl">
                  <button
                    onClick={handleStoreClick}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
                  >
                    <ShoppingBag className="w-5 h-5 text-neon-gold" />
                    <div>
                      <p className="font-medium text-black">Buy Coins</p>
                      <p className="text-xs text-gray-600">Purchase more coins</p>
                    </div>
                  </button>
                  <button
                    onClick={handlePayoutClick}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left border-t border-gray-200"
                  >
                    <CreditCard className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-black">Request Payout</p>
                      <p className="text-xs text-gray-600">Convert coins to cash</p>
                    </div>
                  </button>
                  <button
                    onClick={handlePayPalClick}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left border-t border-gray-200"
                  >
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-black">PayPal Settings</p>
                      <p className="text-xs text-gray-600">Connect or update PayPal</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsed Wallet Button */}
        {sidebarCollapsed && (
          <div className="p-2 border-t border-white/10">
            <button
              onClick={() => setStoreOpen(true)}
              className="w-full flex flex-col items-center gap-1 p-2 rounded-lg text-neon-gold hover:bg-white/10 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="text-xs font-bold">{coins.toLocaleString()}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
