import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Play, Users, Clock, ChevronRight } from 'lucide-react'
import { useLiveShows, useUpcomingShows, useTrendingPerformers } from '../hooks/useSupabaseData'
import type { Show, User } from '../lib/supabase'

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

// Show card component
function ShowCard({ show }: { show: Show }) {
  return (
    <Link
      to={`/show/${show.id}`}
      className="group block glass rounded-xl overflow-hidden card-neon-hover"
    >
      <div className="relative aspect-video">
        <img
          src={show.thumbnail || 'https://picsum.photos/seed/default/400/225'}
          alt={show.title}
          className="w-full h-full object-cover"
        />
        {show.status === 'live' && (
          <div className="absolute top-2 left-2 flex items-center gap-1">
            <span className="live-badge pulse-live flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full"></span>
              LIVE
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <h3 className="font-bold text-white group-hover:text-neon-yellow transition-colors">{show.title}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Clock className="w-4 h-4" />
            <span>{new Date(show.start_time).toLocaleDateString()}</span>
            {show.status === 'live' && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {show.viewer_count.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        {show.status === 'live' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 rounded-full btn-neon-red flex items-center justify-center neon-glow-red">
              <Play className="w-8 h-8 ml-1" fill="white" />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}

// Performer card component
function PerformerCard({ performer }: { performer: User }) {
  return (
    <div className="flex-shrink-0 w-32 sm:w-40">
      <Link to={`/profile/${performer.id}`} className="block group">
        <div className="relative w-24 h-24 mx-auto mb-3 rounded-full avatar-ring overflow-hidden">
          <img
            src={performer.avatar || `https://i.pravatar.cc/150?u=${performer.id}`}
            alt={performer.username}
            className="w-full h-full object-cover"
          />
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
  const { shows: liveShows, loading: liveLoading } = useLiveShows()
  const { shows: upcomingShows, loading: upcomingLoading } = useUpcomingShows()
  const { performers, loading: performersLoading } = useTrendingPerformers()

  const nextShow = upcomingShows[0]
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
          
          {/* Countdown */}
          {nextShow && (
            <div className="mb-8">
              <p className="text-lg text-neon-yellow mb-4 flex items-center justify-center gap-2">
                <Clock className="w-5 h-5" />
                Next Show Starts In
              </p>
              <CountdownTimer targetDate={nextShowDate} />
            </div>
          )}
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to={liveShows[0] ? `/show/${liveShows[0].id}` : '/live-shows'}
              className="btn-neon-red px-8 py-4 rounded-full text-lg flex items-center gap-2 neon-glow-red"
            >
              <Play className="w-6 h-6" fill="white" />
              Watch Live Now
            </Link>
            <Link
              to="/audition"
              className="btn-neon-gold px-8 py-4 rounded-full text-lg neon-glow-gold"
            >
              Submit Audition
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Shows */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-candy-red">🔥</span>
            Featured Shows
          </h2>
          <Link to="/shows" className="text-neon-yellow hover:text-glow-gold flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {liveLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass rounded-xl aspect-video animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {liveShows.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        )}
      </section>

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

      {/* Upcoming Shows */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-neon-yellow">📅</span>
            Upcoming Shows
          </h2>
        </div>
        {upcomingLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 h-20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingShows.map((show) => (
              <Link
                key={show.id}
                to={`/show/${show.id}`}
                className="flex items-center justify-between glass rounded-xl p-4 hover:border-neon-gold/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-candy-red/20 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-candy-red" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{show.title}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(show.start_time).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-neon-gold">
                  <Clock className="w-4 h-4" />
                  <CountdownTimer targetDate={show.start_time} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Live Shows CTA */}
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
            to="/live-shows"
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
