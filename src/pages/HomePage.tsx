import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Play, Clock, Trophy, Star, Music, Mic, Zap, Gift, Users, Calendar } from 'lucide-react'
import { useLiveShows, useTrendingPerformers, useUpcomingShows } from '../hooks/useSupabaseData'

// Colors as specified
const COLORS = {
  black: '#050505',
  darkBlack: '#0d0d0d',
  gold: '#FFD54A',
  red: '#FF2D2D',
  orange: '#FF7A00',
  purple: '#9333ea',
}

const TALENT_CATEGORIES = [
  { icon: <Mic className="w-4 h-4" />, name: 'Sing' },
  { icon: <Music className="w-4 h-4" />, name: 'Dance' },
  { icon: <Zap className="w-4 h-4" />, name: 'Comedy' },
  { icon: <Music className="w-4 h-4" />, name: 'Music' },
]

export function HomePage() {
  const { shows: liveShows } = useLiveShows()
  const { performers } = useTrendingPerformers()
  const { shows: upcomingShows } = useUpcomingShows()
  
  // Get the next show time from upcoming shows
  const nextShow = upcomingShows[0]
  
  // Countdown to next show
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })
  
  useEffect(() => {
    if (!nextShow?.start_time) return
    
    const targetDate = new Date(nextShow.start_time).getTime()
    
    const updateCountdown = () => {
      const now = Date.now()
      const diff = targetDate - now
      
      if (diff > 0) {
        setCountdown({
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        })
      }
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [nextShow?.start_time])
  
  // Display shows - only real live shows from database
  const displayShows = liveShows.slice(0, 3).map((show) => ({
    ...show,
    title: show.title || 'Live Show',
    host: 'Host',
    viewers: show.viewer_count ? `${show.viewer_count}` : '0',
    image: '🎭'
  }))
  
  // Display performers - only real performers from database
  const displayPerformers = performers.slice(0, 3)
  
  // Calculate total viewers watching now from real data
  const totalViewers = liveShows.reduce((sum, show) => sum + (show.viewer_count || 0), 0)

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.black }}>
      {/* ============================================ */}
      {/* 1. HERO / STAGE HEADER */}
      {/* ============================================ */}
      <section 
        className="relative overflow-hidden"
        style={{ 
          paddingTop: '80px', 
          paddingBottom: '80px',
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(255, 122, 0, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 30% 20%, rgba(255, 213, 74, 0.1) 0%, transparent 40%),
            radial-gradient(ellipse at 70% 20%, rgba(255, 213, 74, 0.1) 0%, transparent 40%),
            ${COLORS.black}
          `
        }}
      >
        {/* Stage Curtains - Left - Realistic velvet theater curtains */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1/4 z-20 overflow-hidden"
        >
          <div className="h-full" style={{
            background: `
              linear-gradient(
                to bottom,
                rgba(255,120,120,0.5) 0%,
                rgba(180,0,0,0.5) 40%,
                rgba(120,0,0,0.7) 70%,
                rgba(60,0,0,0.8) 100%
              )
            `
          }}>
            {/* Velvet fabric texture */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  rgba(0,0,0,0.1) 0px,
                  rgba(0,0,0,0.2) 10px,
                  rgba(255,255,255,0.03) 15px,
                  rgba(0,0,0,0.15) 22px
                )
              `
            }}></div>
            
            {/* Curtain folds */}
            {[...Array(8)].map((_, i) => (
              <div key={`fold-${i}`} className="absolute top-0 h-full animate-curtain-sway" style={{
                left: `${i * 10 + 2}%`,
                width: '16%',
                background: `
                  linear-gradient(
                    to bottom,
                    rgba(255,100,100,0.25) 0%,
                    rgba(100,0,0,0.5) 50%,
                    rgba(50,0,0,0.7) 100%
                  )
                `,
                boxShadow: 'inset -6px 0 15px rgba(0,0,0,0.4)',
                animationDelay: `${i * 0.3}s`,
                transform: `skewX(${-2 + i * 0.5}deg)`
              }}></div>
            ))}
            
            {/* Bottom shadow */}
            <div className="absolute bottom-0 left-0 right-0 h-20" style={{
              background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5) 100%)'
            }}></div>
            
            {/* Valance (top decorative piece) */}
            <div className="absolute top-0 left-0 right-0 h-24" style={{
              background: `
                radial-gradient(ellipse 30% 100% at 15% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                radial-gradient(ellipse 30% 100% at 50% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                radial-gradient(ellipse 30% 100% at 85% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                linear-gradient(180deg, #ff3b3b 0%, #b30000 100%)
              `
            }}></div>
            
            {/* Valance shadow */}
            <div className="absolute top-20 left-0 right-0 h-6" style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)'
            }}></div>
          </div>
        </div>
        
        {/* Stage Curtains - Right - Realistic velvet theater curtains */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-1/4 z-20 overflow-hidden"
        >
          <div className="h-full ml-auto" style={{
            background: `
              linear-gradient(
                to bottom,
                rgba(255,120,120,0.5) 0%,
                rgba(180,0,0,0.5) 40%,
                rgba(120,0,0,0.7) 70%,
                rgba(60,0,0,0.8) 100%
              )
            `
          }}>
            {/* Velvet fabric texture */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  rgba(0,0,0,0.1) 0px,
                  rgba(0,0,0,0.2) 10px,
                  rgba(255,255,255,0.03) 15px,
                  rgba(0,0,0,0.15) 22px
                )
              `
            }}></div>
            
            {/* Curtain folds */}
            {[...Array(8)].map((_, i) => (
              <div key={`fold-r-${i}`} className="absolute top-0 h-full animate-curtain-sway" style={{
                right: `${i * 10 + 2}%`,
                width: '16%',
                background: `
                  linear-gradient(
                    to bottom,
                    rgba(255,100,100,0.25) 0%,
                    rgba(100,0,0,0.5) 50%,
                    rgba(50,0,0,0.7) 100%
                  )
                `,
                boxShadow: 'inset 6px 0 15px rgba(0,0,0,0.4)',
                animationDelay: `${i * 0.3 + 0.15}s`,
                transform: `skewX(${2 - i * 0.5}deg)`
              }}></div>
            ))}
            
            {/* Bottom shadow */}
            <div className="absolute bottom-0 left-0 right-0 h-20" style={{
              background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5) 100%)'
            }}></div>
            
            {/* Valance (top decorative piece) */}
            <div className="absolute top-0 left-0 right-0 h-24" style={{
              background: `
                radial-gradient(ellipse 30% 100% at 15% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                radial-gradient(ellipse 30% 100% at 50% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                radial-gradient(ellipse 30% 100% at 85% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                linear-gradient(180deg, #ff3b3b 0%, #b30000 100%)
              `
            }}></div>
            
            {/* Valance shadow */}
            <div className="absolute top-20 left-0 right-0 h-6" style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)'
            }}></div>
          </div>
        </div>
        
        {/* Curtain divider */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[4px] -translate-x-1/2 pointer-events-none z-25
          bg-gradient-to-b from-black/30 via-black/50 to-black/30 blur-[1px]"></div>

        {/* Spotlight Beams */}
        <div 
          className="absolute top-0 left-1/4 w-64 h-full pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255, 213, 74, 0.15) 0%, transparent 100%)',
            filter: 'blur(20px)'
          }}
        />
        <div 
          className="absolute top-0 right-1/4 w-64 h-full pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255, 213, 74, 0.15) 0%, transparent 100%)',
            filter: 'blur(20px)'
          }}
        />
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-full pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255, 122, 0, 0.2) 0%, transparent 100%)',
            filter: 'blur(30px)'
          }}
        />

        {/* Centered Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Main Title */}
          <h1 
            className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 tracking-wider"
            style={{
              color: COLORS.gold,
              textShadow: `
                0 0 20px ${COLORS.gold},
                0 0 40px rgba(255, 213, 74, 0.5),
                0 0 60px rgba(255, 213, 74, 0.3)
              `
            }}
          >
            MAITALENT
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto">
            "The World's First Live Interactive Talent Show"
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {/* Primary Button - Audition Now */}
            <Link
              to="/audition"
              className="group relative px-8 py-4 rounded-full text-lg font-bold flex items-center gap-3 transition-all duration-300 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${COLORS.red} 0%, #cc0000 100%)`,
                color: 'white',
                boxShadow: `
                  0 0 20px rgba(255, 45, 45, 0.5),
                  0 0 40px rgba(255, 45, 45, 0.3)
                `
              }}
            >
              <Play className="w-5 h-5" fill="white" />
              AUDITION NOW
              <span 
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  boxShadow: `0 0 30px ${COLORS.red}, 0 0 60px ${COLORS.red}`
                }}
              />
            </Link>

            {/* Secondary Button - Watch Live */}
            <Link
              to={liveShows[0] ? `/show/${liveShows[0].id}` : '/show/preview'}
              className="group relative px-8 py-4 rounded-full text-lg font-bold flex items-center gap-3 transition-all duration-300 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${COLORS.purple} 0%, #7c3aed 100%)`,
                color: 'white',
                boxShadow: `
                  0 0 15px rgba(147, 51, 234, 0.4),
                  0 0 30px rgba(147, 51, 234, 0.2)
                `
              }}
            >
              <Play className="w-5 h-5" fill="white" />
              WATCH LIVE
              <span 
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  boxShadow: `0 0 25px ${COLORS.purple}, 0 0 50px ${COLORS.purple}`
                }}
              />
            </Link>
          </div>

          {/* Viewer Count - Real data */}
          <div className="flex items-center justify-center gap-2 text-lg">
            <Star className="w-5 h-5" style={{ color: COLORS.gold }} fill={COLORS.gold} />
            <span style={{ color: COLORS.gold }} className="font-bold">
              {totalViewers > 0 ? totalViewers.toLocaleString() : '0'}
            </span>
            <span className="text-gray-400">Viewers Watching Now</span>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* 2. LIVE SHOWS SECTION */}
      {/* ============================================ */}
      <section className="py-16 px-4" style={{ backgroundColor: COLORS.black }}>
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <h2 
            className="text-3xl font-bold mb-8 flex items-center gap-3"
            style={{
              color: 'white',
              textShadow: `0 0 10px rgba(255, 45, 45, 0.5)`
            }}
          >
            <span style={{ color: COLORS.orange }}>🔥</span>
            LIVE SHOWS
          </h2>

          {/* Show Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Placeholder when no live shows - show next upcoming with countdown */}
            {displayShows.length === 0 && nextShow && (
              <div 
                className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                style={{
                  backgroundColor: COLORS.darkBlack,
                  border: `1px solid ${COLORS.gold}`,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                }}
              >
                {/* Hover Glow Effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    boxShadow: `0 0 30px ${COLORS.orange}, 0 0 60px rgba(255, 122, 0, 0.3)`
                  }}
                />

                {/* Top Image Area */}
                <div className="relative h-40 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)' }}>
                  <span className="text-6xl">🎪</span>
                  
                  {/* Coming Soon Badge */}
                  <div 
                    className="absolute top-3 right-3 px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                    style={{
                      backgroundColor: COLORS.orange,
                      color: 'white'
                    }}
                  >
                    <Calendar className="w-3 h-3" />
                    COMING UP
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-2">{nextShow.title || 'Next Show'}</h3>
                  <p className="text-sm text-gray-400 mb-2">
                    {nextShow.start_time ? `Next show: ${new Date(nextShow.start_time).toLocaleDateString()}` : 'Be the first to join!'}
                  </p>
                  
                  {/* Countdown Timer */}
                  <div className="flex items-center justify-center gap-2 mb-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255, 122, 0, 0.1)' }}>
                    <Clock className="w-4 h-4" style={{ color: COLORS.orange }} />
                    <span className="text-sm font-bold" style={{ color: COLORS.orange }}>
                      {countdown.hours > 0 ? `${countdown.hours}h ` : ''}{countdown.minutes}m {countdown.seconds}s
                    </span>
                  </div>

                  {/* Join Show Button */}
                  <Link
                    to="/audition"
                    className="block w-full py-2 rounded-lg text-center font-bold transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      backgroundColor: COLORS.orange,
                      color: 'white',
                      boxShadow: `0 0 10px rgba(255, 122, 0, 0.3)`
                    }}
                  >
                    Join Show
                  </Link>
                </div>
              </div>
            )}
            
            {/* Actual live show cards - only if there are live shows */}
            {displayShows.length > 0 && displayShows.map((show, index) => (
              <div 
                key={show.id || index}
                className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                style={{
                  backgroundColor: COLORS.darkBlack,
                  border: `1px solid ${COLORS.gold}`,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                }}
              >
                {/* Hover Glow Effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    boxShadow: `0 0 30px ${COLORS.orange}, 0 0 60px rgba(255, 122, 0, 0.3)`
                  }}
                />

                {/* Top Image Area */}
                <div className="relative h-40 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)' }}>
                  <span className="text-6xl">{show.image}</span>
                  
                  {/* LIVE Badge */}
                  <div 
                    className="absolute top-3 right-3 px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                    style={{
                      backgroundColor: COLORS.red,
                      color: 'white',
                      animation: 'pulse-live 2s infinite'
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-2">{show.title}</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Host {show.host} • {show.viewers} viewers
                  </p>

                  {/* Watch Live Button */}
                  <Link
                    to={`/show/${show.id}`}
                    className="block w-full py-2 rounded-lg text-center font-bold transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      backgroundColor: COLORS.red,
                      color: 'white',
                      boxShadow: `0 0 10px rgba(255, 45, 45, 0.3)`
                    }}
                  >
                    Watch Live
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* 3. MAIN CONTENT + RIGHT SIDEBAR */}
      {/* ============================================ */}
      <section className="py-16 px-4" style={{ backgroundColor: COLORS.black }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left: TRENDING PERFORMERS (moved before sidebar per visual flow) */}
            <div className="flex-1">
              {/* Section Header */}
              <h2 
                className="text-3xl font-bold mb-8 flex items-center gap-3"
                style={{
                  color: 'white',
                  textShadow: `0 0 10px rgba(255, 213, 74, 0.5)`
                }}
              >
                <span style={{ color: COLORS.gold }}>⭐</span>
                TRENDING PERFORMERS
              </h2>

              {/* Performer Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
                {displayPerformers.map((performer, index) => (
                  <Link
                    key={performer.id || index}
                    to={`/profile/${performer.id}`}
                    className="group block"
                  >
                    <div 
                      className="rounded-xl p-6 text-center transition-all duration-300 hover:scale-[1.03]"
                      style={{
                        backgroundColor: COLORS.darkBlack,
                        border: `1px solid rgba(255, 213, 74, 0.3)`,
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      {/* Avatar */}
                      <div 
                        className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden"
                        style={{
                          border: `3px solid ${COLORS.gold}`,
                          boxShadow: `0 0 15px rgba(255, 213, 74, 0.3)`
                        }}
                      >
                        <img
                          src={performer.avatar || `https://i.pravatar.cc/150?u=${performer.id}`}
                          alt={performer.username}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Name */}
                      <h3 className="text-lg font-bold text-white group-hover:text-gold transition-colors" style={{ color: COLORS.gold }}>
                        {performer.username}
                      </h3>

                      {/* Role */}
                      <p className="text-sm text-gray-400">{performer.talent_category}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Watch Live Button */}
              <div className="text-center">
                <Link
                  to="/leaderboard"
                  className="inline-block px-8 py-3 rounded-full font-bold transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundColor: COLORS.red,
                    color: 'white',
                    boxShadow: `0 0 20px rgba(255, 45, 45, 0.4)`
                  }}
                >
                  Watch Live
                </Link>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:w-80 flex-shrink-0 space-y-6">
              
              {/* Upcoming Shows Card - uses real data */}
              <div 
                className="rounded-xl p-5"
                style={{
                  backgroundColor: COLORS.darkBlack,
                  border: `1px solid rgba(255, 213, 74, 0.3)`,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                }}
              >
                <h3 
                  className="text-lg font-bold mb-4 flex items-center gap-2"
                  style={{ color: COLORS.gold }}
                >
                  <Clock className="w-5 h-5" />
                  UPCOMING SHOWS
                </h3>

                <div className="space-y-3">
                  {upcomingShows.slice(0, 3).map((show, index) => (
                    <div key={show.id || index}>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-bold text-white">{show.title || 'Upcoming Show'}</p>
                          <p className="text-sm text-gray-400">
                            {show.start_time ? new Date(show.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                          </p>
                        </div>
                      </div>
                      {index < Math.min(upcomingShows.length, 3) - 1 && (
                        <div className="h-px" style={{ backgroundColor: 'rgba(255, 213, 74, 0.2)' }} />
                      )}
                    </div>
                  ))}
                  {upcomingShows.length === 0 && (
                    <p className="text-gray-400 text-sm py-2">No upcoming shows scheduled</p>
                  )}
                </div>
              </div>

              {/* Season 1 Auditions Card */}
              <div 
                className="rounded-xl p-5"
                style={{
                  backgroundColor: COLORS.darkBlack,
                  border: `1px solid rgba(255, 213, 74, 0.3)`,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                }}
              >
                <h3 
                  className="text-lg font-bold mb-4 flex items-center gap-2"
                  style={{ color: COLORS.gold }}
                >
                  <Trophy className="w-5 h-5" />
                  SEASON 1 AUDITIONS OPEN
                </h3>

                <div className="space-y-2">
                  {TALENT_CATEGORIES.map((category, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 py-2"
                    >
                      <span style={{ color: COLORS.orange }}>{category.icon}</span>
                      <span className="text-gray-300">{category.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* 5. SUPPORT YOUR FAVORITE TALENT SECTION */}
      {/* ============================================ */}
      <section 
        className="py-20 px-4"
        style={{
          background: `
            radial-gradient(ellipse at 50% 50%, rgba(255, 45, 45, 0.15) 0%, transparent 60%),
            ${COLORS.black}
          `
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-4xl font-black mb-8"
            style={{
              color: COLORS.gold,
              textShadow: `
                0 0 20px ${COLORS.gold},
                0 0 40px rgba(255, 213, 74, 0.5)
              `
            }}
          >
            SUPPORT YOUR FAVORITE TALENT
          </h2>

          {/* Engagement Features */}
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            <div className="flex items-center gap-2">
              <Gift className="w-6 h-6" style={{ color: COLORS.red }} />
              <span className="text-gray-300 text-lg">Send Gifts</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6" style={{ color: COLORS.gold }} />
              <span className="text-gray-300 text-lg">Vote Live</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6" style={{ color: COLORS.orange }} />
              <span className="text-gray-300 text-lg">Earn Coins</span>
            </div>
          </div>

          {/* Join Live Shows Button */}
          <Link
            to="/show/preview"
            className="inline-block px-12 py-5 rounded-full text-xl font-bold transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: COLORS.red,
              color: 'white',
              boxShadow: `
                0 0 30px rgba(255, 45, 45, 0.5),
                0 0 60px rgba(255, 45, 45, 0.3)
              `
            }}
          >
            JOIN LIVE SHOWS
          </Link>
        </div>
      </section>

      {/* CSS for pulse and curtain animations */}
      <style>{`
        @keyframes pulse-live {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(255, 45, 45, 0.7);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 0 10px rgba(255, 45, 45, 0);
          }
        }
        
        @keyframes curtain-sway {
          0%, 100% {
            transform: skewX(var(--sway-direction, -2deg));
          }
          50% {
            transform: skewX(calc(var(--sway-direction, -2deg) + 2deg));
          }
        }
        
        .animate-curtain-sway {
          animation: curtain-sway 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
