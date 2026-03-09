import { Link, useNavigate } from 'react-router-dom'
import { Search, Bell, User, Wallet, Settings, LogOut, Video, Mic } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useState } from 'react'

export function Header() {
  const { user, toggleSidebar } = useAppStore()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
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
            <div className="w-10 h-10 rounded-lg gradient-candy-red flex items-center justify-center neon-glow-red">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-2xl font-bold shimmer-gold hidden sm:block">MAI Talent</span>
          </Link>
        </div>

        {/* Center - Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-8 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search shows, performers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full input-neon"
            />
          </div>
        </form>

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/go-live"
            className="btn-neon-red px-4 py-2 rounded-full flex items-center gap-2 text-sm"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Broadcast Live</span>
          </Link>
          
          <Link
            to="/audition"
            className="btn-neon-gold px-4 py-2 rounded-full flex items-center gap-2 text-sm"
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Submit Audition</span>
          </Link>

          <button className="relative p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Bell className="w-6 h-6 text-neon-yellow" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-candy-red rounded-full"></span>
          </button>

          <div className="relative">
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
                    to="/wallet"
                    className="flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Wallet</span>
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
                    onClick={() => {
                      setShowDropdown(false)
                      // Handle logout
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
