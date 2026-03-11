import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, Clock, Trophy, Star, Music, Mic, Zap, Gift, Users, Calendar } from 'lucide-react'
import { useLiveShows, useTrendingPerformers, useUpcomingShows } from '../hooks/useSupabaseData'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

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
  
  // State for audition button
  const [joiningQueue, setJoiningQueue] = useState(false)
  const navigate = useNavigate()
  const { user } = useAppStore()
  
  // Handle joining the queue
  const handleJoinQueue = async () => {
    if (!user) {
      // Not logged in, redirect to auth
      navigate('/auth')
      return
    }
    
    setJoiningQueue(true)
    try {
      // Get the current live show
      const showId = liveShows[0]?.id
      
      // Check if user is already in queue
      const { data: existingQueue } = await supabase
        .from('show_queue')
        .select('*')
        .eq('show_id', showId)
        .eq('user_id', user.id)
        .single()
      
      if (existingQueue) {
        alert('You are already in the queue!')
        setJoiningQueue(false)
        return
      }
      
      // Get current queue length
      const { data: queueData } = await supabase
        .from('show_queue')
        .select('position')
        .eq('show_id', showId)
        .order('position', { ascending: false })
        .limit(1)
      
      const nextPosition = queueData && queueData.length > 0 ? queueData[0].position + 1 : 1
      
      // Add user to queue
      const { error } = await supabase
        .from('show_queue')
        .insert({
          show_id: showId,
          user_id: user.id,
          position: nextPosition,
          status: 'waiting'
        })
      
      if (error) throw error
      
      alert('You have been added to the queue! Wait for your turn to perform.')
      
      // Navigate to the show
      navigate(`/show/${showId}`)
    } catch (err) {
      console.error('Error joining queue:', err)
      alert('Failed to join queue. Please try again.')
    } finally {
      setJoiningQueue(false)
    }
  }

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
            <button
              onClick={handleJoinQueue}
              disabled={joiningQueue}
              className="group relative px-8 py-4 rounded-full text-lg font-bold flex items-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${COLORS.red} 0%, #cc0000 100%)`,
                color: 'white',
                boxShadow: `
                  0 0 20px rgba(255, 45, 45, 0.5),
                  0 0 40px rgba(255, 45, 45, 0.3)
                `
              }}
            >
              {joiningQueue ? (
                <Play className="w-5 h-5 animate-pulse" />
              ) : (
                <Play className="w-5 h-5" fill="white" />
              )}
              {joiningQueue ? 'JOINING...' : 'AUDITION NOW'}
              <span 
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  boxShadow: `0 0 30px ${COLORS.red}, 0 0 60px ${COLORS.red}`
                }}
              />
            </button>

            {/* Secondary Button - Watch Live */}
            <Link
              to={liveShows[0] ? `/show/${liveShows[0].id}` : '/show'}
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
                  to="/show"
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
            to="/show"
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
