import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Play, Clock, ChevronRight, Youtube, Trophy, X } from 'lucide-react'
import { useLiveShows, useUpcomingShows, useTrendingPerformers, useAllSeasons, useShowsBySeason } from '../hooks/useSupabaseData'
import { useUserRole } from '../hooks/useUserRole'
import type { User, Season } from '../lib/supabase'

// Daily show time: 5pm MST (UTC-7)
const DAILY_SHOW_HOUR = 17
const DAILY_SHOW_MINUTE = 0

// Get the next show time at 5pm MST
function getNextShowTime(): Date {
  const now = new Date()
  // Create a date for today at 5pm MST
  const showTime = new Date(now)
  showTime.setHours(DAILY_SHOW_HOUR, DAILY_SHOW_MINUTE, 0, 0)
  
  // If it's already past 5pm MST today, get tomorrow's show
  if (now.getHours() > DAILY_SHOW_HOUR || 
      (now.getHours() === DAILY_SHOW_HOUR && now.getMinutes() >= DAILY_SHOW_MINUTE)) {
    showTime.setDate(showTime.getDate() + 1)
  }
  
  return showTime
}

// Countdown component
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const target = new Date(targetDate).getTime()
    
    const interval = setInterval(() => {
      const now = Date.now()
      const diff = target - now

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {[
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hours' },
        { value: timeLeft.minutes, label: 'Mins' },
        { value: timeLeft.seconds, label: 'Secs' },
      ].map((item, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <div className="countdown-digit w-12 h-14 sm:w-16 sm:h-20 rounded-lg flex items-center justify-center text-2xl sm:text-4xl font-bold text-neon-yellow">
            {String(item.value).padStart(2, '0')}
          </div>
          <span className="text-xs text-gray-400 mt-1">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// Performer card component with fire theme
function PerformerCard({ performer }: { performer: User }) {
  return (
    <div className="flex-shrink-0 w-32 sm:w-40">
      <Link to={`/profile/${performer.id}`} className="block group">
        <div className="relative w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden">
          {/* Fire glow effect */}
          <div className="absolute inset-0 rounded-full fire-glow animate-pulse-slow"></div>
          <div className="absolute inset-1 rounded-full overflow-hidden border-2 border-orange-500 fire-border">
            <img
              src={performer.avatar || `https://i.pravatar.cc/150?u=${performer.id}`}
              alt={performer.username}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="w-8 h-8 text-neon-yellow" fill="currentColor" />
          </div>
        </div>
        <h4 className="font-bold text-center text-neon-yellow group-hover:text-glow-gold transition-all">
          @{performer.username}
        </h4>
        <p className="text-xs text-center text-gray-400">{performer.talent_category}</p>
      </Link>
    </div>
  )
}

export function HomePage() {
  const { shows: liveShows } = useLiveShows()
  const { shows: upcomingShows, loading: upcomingLoading } = useUpcomingShows()
  const { performers, loading: performersLoading } = useTrendingPerformers()
  const { seasons, loading: seasonsLoading } = useAllSeasons()
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const { shows: seasonShows, loading: seasonShowsLoading } = useShowsBySeason(selectedSeason?.id || null)
  const { isCeo, isAdmin } = useUserRole()
  const canStartShow = isCeo || isAdmin

  const nextShow = upcomingShows[0]
  
  // Calculate daily show time at 5pm MST
  const dailyShowTime = useMemo(() => getNextShowTime(), [])
  
  // State for daily show countdown
  const [dailyCountdown, setDailyCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isDailyShowToday, setIsDailyShowToday] = useState(false)
  
  useEffect(() => {
    const updateDailyCountdown = () => {
      const now = new Date()
      const showTime = new Date(dailyShowTime)
      
      // Check if show is today
      const isToday = now.getDate() === showTime.getDate() && 
                      now.getMonth() === showTime.getMonth() &&
                      now.getFullYear() === showTime.getFullYear()
      setIsDailyShowToday(isToday)
      
      const diff = showTime.getTime() - now.getTime()
      
      if (diff > 0) {
        setDailyCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        })
      }
    }
    
    updateDailyCountdown()
    const interval = setInterval(updateDailyCountdown, 1000)
    return () => clearInterval(interval)
  }, [dailyShowTime])
  
  const defaultDate = new Date()
  defaultDate.setDate(defaultDate.getDate() + 1)
  const nextShowDate = nextShow?.start_time || defaultDate.toISOString()

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden neon-border-red">
        <div className="absolute inset-0 stage-gradient" />
        <div className="absolute inset-0 bg-gradient-to-r from-candy-red/30 via-transparent to-neon-gold/30" />
        <div className="absolute inset-0 spotlight-gradient" />
        
        {/* Animated neon lines */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-candy-red/50 to-transparent animate-pulse" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-gold/50 to-transparent animate-pulse delay-75" />
          <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-candy-red/50 to-transparent animate-pulse delay-150" />
        </div>
        
        <div className="relative z-10 py-12 sm:py-20 px-6 text-center">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black mb-4">
            <span className="shimmer-red">MAI</span>{' '}
            <span className="shimmer-gold">TALENT</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Where stars are born! Watch live performances, vote for your favorites, and discover the next big thing.
          </p>
          
          {/* Countdown - Daily Show at 5pm MST */}
          <div className="mb-8">
            {isDailyShowToday ? (
              <div className="mb-4">
                <p className="text-lg text-candy-red mb-4 flex items-center justify-center gap-2 animate-pulse">
                  <Clock className="w-5 h-5" />
                  Today's Live Show Starting Soon!
                </p>
                <CountdownTimer targetDate={dailyShowTime.toISOString()} />
              </div>
            ) : dailyCountdown.days > 0 ? (
              <div className="mb-4">
                <p className="text-lg text-neon-yellow mb-4 flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  Daily Show Starts In
                </p>
                <CountdownTimer targetDate={dailyShowTime.toISOString()} />
              </div>
            ) : nextShow ? (
              <div className="mb-4">
                <p className="text-lg text-neon-yellow mb-4 flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  Next Show Starts In
                </p>
                <CountdownTimer targetDate={nextShowDate} />
              </div>
            ) : null}
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            {canStartShow && (
              <Link
                to="/go-live"
                className="btn-neon-gold px-8 py-4 rounded-full text-lg flex items-center gap-2 neon-glow-gold"
              >
                <Play className="w-6 h-6" fill="white" />
                Start Show
              </Link>
            )}
            <Link
              to={liveShows[0] ? `/show/${liveShows[0].id}` : '/show/preview'}
              className="btn-neon-red px-8 py-4 rounded-full text-lg flex items-center gap-2 neon-glow-red"
            >
              <Play className="w-6 h-6" fill="white" />
              Auditions
            </Link>
            <Link
              to="/calendar"
              className="btn-neon-purple px-8 py-4 rounded-full text-lg"
            >
              Upcoming Shows
            </Link>
          </div>
        </div>
      </section>

      {/* Season Grid - Shows from first to last season */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-neon-gold">🏆</span>
            Seasons
          </h2>
        </div>
        {seasonsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-square glass rounded-xl animate-pulse" />
            ))}
          </div>
        ) : seasons.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {seasons.map((season, index) => (
              <button
                key={season.id}
                onClick={() => setSelectedSeason(season)}
                className="aspect-square glass rounded-xl p-4 hover:border-neon-gold/50 transition-all group flex flex-col items-center justify-center"
              >
                <div className="text-3xl mb-2">🏆</div>
                <h3 className="font-bold text-white group-hover:text-neon-gold transition-colors">{season.name}</h3>
                <p className="text-xs text-gray-400 mt-1">Season {index + 1}</p>
                <span className={`text-xs mt-2 px-2 py-1 rounded ${
                  season.status === 'active' ? 'bg-green-600/80 text-white' :
                  season.status === 'completed' ? 'bg-gray-600/80 text-white' :
                  'bg-blue-600/80 text-white'
                }`}>
                  {season.status}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No seasons available yet</p>
          </div>
        )}
      </section>

      {/* Season Shows Modal */}
      {selectedSeason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="glass rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-neon-gold">{selectedSeason.name} - Shows</h3>
              <button
                onClick={() => setSelectedSeason(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {seasonShowsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass rounded-xl p-4 animate-pulse" />
                  ))}
                </div>
              ) : seasonShows.length > 0 ? (
                <div className="grid gap-4">
                  {seasonShows.map((show) => (
                    <Link
                      key={show.id}
                      to={`/show/${show.id}`}
                      onClick={() => setSelectedSeason(null)}
                      className="flex items-center gap-4 glass rounded-xl p-4 hover:border-neon-gold/50 transition-all"
                    >
                      <div className="w-24 h-16 rounded-lg bg-candy-red/20 flex items-center justify-center">
                        {show.status === 'live' ? (
                          <span className="live-badge pulse-live text-xs">LIVE</span>
                        ) : show.youtube_video_id ? (
                          <Youtube className="w-6 h-6 text-red-500" />
                        ) : (
                          <Play className="w-6 h-6 text-candy-red" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white">{show.title}</h4>
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {new Date(show.start_time).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        show.status === 'live' ? 'bg-green-600/80 text-white' :
                        show.status === 'completed' ? 'bg-gray-600/80 text-white' :
                        show.status === 'ended' ? 'bg-red-600/80 text-white' :
                        'bg-blue-600/80 text-white'
                      }`}>
                        {show.status}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No shows for this season yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trending Performers */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-neon-gold">⭐</span>
            Trending Performers
          </h2>
          <Link to="/leaderboard" className="text-neon-yellow hover:text-glow-gold flex items-center gap-1">
            View Leaderboard <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {performersLoading ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32 sm:w-40">
                <div className="w-24 h-24 mx-auto mb-3 rounded-full animate-pulse bg-gray-700" />
                <div className="h-4 w-20 mx-auto rounded animate-pulse bg-gray-700" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6">
            {performers.map((performer) => (
              <PerformerCard key={performer.id} performer={performer} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Shows - Horizontal Scroll */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-neon-yellow">📅</span>
            Upcoming Shows
          </h2>
          <Link to="/calendar" className="text-neon-yellow hover:text-glow-gold flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {upcomingLoading ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-80 glass rounded-xl p-4 h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6">
            {upcomingShows.slice(0, 5).map((show) => (
              <Link
                key={show.id}
                to={`/show/${show.id}`}
                className="flex-shrink-0 w-80 glass rounded-xl p-4 hover:border-neon-gold/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-candy-red/20 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-candy-red" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{show.title}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(show.start_time).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <div className="flex items-center gap-1 text-orange-400 text-xs mt-1">
                      <Clock className="w-3 h-3" />
                      Starts in 
                      <CountdownTimer targetDate={show.start_time} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Browse Live Shows - directs to LiveShowPage */}
      <section className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 gradient-red-to-gold opacity-20" />
        <div className="relative z-10 py-12 px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Join the Excitement!
          </h2>
          <p className="text-gray-300 mb-6 max-w-xl mx-auto">
            Thousands of viewers are watching live right now. Don't miss your chance to see amazing performances and vote for your favorites!
          </p>
          <Link
            to={liveShows[0] ? `/show/${liveShows[0].id}` : '/show/preview'}
            className="btn-neon-red px-8 py-4 rounded-full text-lg inline-flex items-center gap-2"
          >
            <span className="w-3 h-3 bg-white rounded-full pulse-live"></span>
            Browse Live Shows
          </Link>
        </div>
      </section>
    </div>
  )
}
