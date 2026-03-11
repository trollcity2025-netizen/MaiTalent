import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Clock, ChevronRight, Play, Users } from 'lucide-react'
import { useUpcomingShows, useLiveShows } from '../hooks/useSupabaseData'
import type { Show } from '../lib/supabase'

// Group shows by date
function groupShowsByDate(shows: Show[]) {
  const groups: Record<string, Show[]> = {}
  
  shows.forEach(show => {
    const date = new Date(show.start_time).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(show)
  })
  
  return groups
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
            <span>{new Date(show.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
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

export function CalendarPage() {
  const { shows: liveShows, loading: liveLoading } = useLiveShows()
  const { shows: upcomingShows, loading: upcomingLoading } = useUpcomingShows()
  
  // Combine and sort shows
  const allShows = useMemo(() => {
    const combined = [...liveShows, ...upcomingShows]
    return combined.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
  }, [liveShows, upcomingShows])
  
  const showsByDate = useMemo(() => 
    groupShowsByDate(allShows), 
    [allShows]
  )
  
  const dates = Object.keys(showsByDate)
  
  const loading = liveLoading || upcomingLoading

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold shimmer-gold mb-2">📅 Show Calendar</h1>
        <p className="text-gray-400">Browse all upcoming and live shows</p>
      </div>
      
      {/* Calendar Grid by Date */}
      {loading ? (
        <div className="space-y-8">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-8 w-64 bg-gray-700 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(j => (
                  <div key={j} className="glass rounded-xl aspect-video animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : dates.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-xl">No shows scheduled</p>
        </div>
      ) : (
        <div className="space-y-8">
          {dates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-4">
                <ChevronRight className="w-5 h-5 text-neon-yellow" />
                <h2 className="text-2xl font-bold text-neon-yellow">{date}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {showsByDate[date].map((show) => (
                  <ShowCard key={show.id} show={show} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
