import { Link, useLocation } from 'react-router-dom'
import { Home, Radio, Tv, Mic, Trophy, User, Wallet, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/live-shows', icon: Radio, label: 'Live Shows' },
  { path: '/shows', icon: Tv, label: 'Shows' },
  { path: '/auditions', icon: Mic, label: 'Auditions' },
  { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { path: '/profile', icon: User, label: 'My Profile' },
  { path: '/wallet', icon: Wallet, label: 'Wallet' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

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
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-candy-red/20 text-neon-yellow neon-border-gold'
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
          <div className="p-4 border-t border-white/10">
            <div className="glass-gold rounded-lg p-4">
              <p className="text-sm font-bold text-neon-gold mb-2">Go Live!</p>
              <p className="text-xs text-gray-400 mb-3">Share your talent with the world</p>
              <Link
                to="/go-live"
                className="block text-center btn-neon-gold py-2 rounded-lg text-sm"
              >
                Start Performing
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
