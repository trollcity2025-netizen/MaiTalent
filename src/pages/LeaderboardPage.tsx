import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Medal, Crown, Users, TrendingUp } from 'lucide-react'
import { useLeaderboard } from '../hooks/useSupabaseData'

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center neon-glow-gold">
        <Crown className="w-5 h-5 text-black" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
        <Medal className="w-5 h-5 text-white" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
        <Medal className="w-5 h-5 text-white" />
      </div>
    )
  }
  return (
    <div className="w-10 h-10 rounded-full glass flex items-center justify-center text-gray-400 font-bold">
      {rank}
    </div>
  )
}

export function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const { performers, loading, error } = useLeaderboard(timeFilter)

  const top3 = performers.slice(0, 3)
  const rest = performers.slice(3)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black mb-2 flex items-center justify-center gap-3">
          <Trophy className="w-10 h-10 text-neon-gold" />
          <span className="shimmer-gold">Leaderboard</span>
        </h1>
        <p className="text-gray-400">The top performers this {timeFilter}</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-candy-red">Error loading leaderboard: {error}</p>
        </div>
      ) : performers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No performances yet. Be the first to perform!</p>
        </div>
      ) : (
        <>
          {/* Top 3 */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* Second Place */}
            {top3[1] && (
              <div className="glass rounded-xl p-4 text-center transform translate-y-4">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full border-4 border-gray-400 overflow-hidden">
                  <img src={top3[1].avatar || `https://i.pravatar.cc/150?u=${top3[1].id}`} alt={top3[1].username} className="w-full h-full object-cover" />
                </div>
                <Medal className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <h3 className="font-bold text-white">@{top3[1].username}</h3>
                <p className="text-sm text-gray-400">{top3[1].talent_category}</p>
                <p className="text-neon-yellow font-bold mt-2">{top3[1].total_votes.toLocaleString()} pts</p>
              </div>
            )}

            {/* First Place */}
            {top3[0] && (
              <div className="glass rounded-xl p-4 text-center neon-border-gold transform scale-105">
                <Crown className="w-8 h-8 mx-auto text-neon-gold mb-2" />
                <div className="w-24 h-24 mx-auto mb-3 rounded-full border-4 border-neon-gold overflow-hidden neon-glow-gold">
                  <img src={top3[0].avatar || `https://i.pravatar.cc/150?u=${top3[0].id}`} alt={top3[0].username} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-bold text-neon-gold text-lg">@{top3[0].username}</h3>
                <p className="text-sm text-gray-400">{top3[0].talent_category}</p>
                <p className="text-neon-yellow font-bold mt-2">{top3[0].total_votes.toLocaleString()} pts</p>
                <div className="flex items-center justify-center gap-1 mt-2 text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">+150 today</span>
                </div>
              </div>
            )}

            {/* Third Place */}
            {top3[2] && (
              <div className="glass rounded-xl p-4 text-center transform translate-y-4">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full border-4 border-orange-500 overflow-hidden">
                  <img src={top3[2].avatar || `https://i.pravatar.cc/150?u=${top3[2].id}`} alt={top3[2].username} className="w-full h-full object-cover" />
                </div>
                <Medal className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                <h3 className="font-bold text-white">@{top3[2].username}</h3>
                <p className="text-sm text-gray-400">{top3[2].talent_category}</p>
                <p className="text-neon-yellow font-bold mt-2">{top3[2].total_votes.toLocaleString()} pts</p>
              </div>
            )}
          </div>

          {/* Time Filter */}
          <div className="flex justify-center gap-2 mb-6">
            {(['today', 'week', 'month', 'all'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-2 rounded-full transition-all ${
                  timeFilter === filter
                    ? 'btn-neon-red'
                    : 'glass hover:bg-white/10'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Full Leaderboard */}
          <div className="space-y-3">
            {rest.map((performer, idx) => (
              <Link
                key={performer.id}
                to={`/profile/${performer.id}`}
                className="flex items-center gap-4 glass rounded-xl p-4 hover:border-neon-gold/50 transition-colors"
              >
                <RankBadge rank={idx + 4} />
                
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img src={performer.avatar || `https://i.pravatar.cc/150?u=${performer.id}`} alt={performer.username} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-white">@{performer.username}</h3>
                  <p className="text-sm text-gray-400">{performer.talent_category}</p>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-neon-yellow">{performer.total_votes.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">points</p>
                </div>
                
                <div className="text-right">
                  <p className="flex items-center gap-1 text-candy-red">
                    <Users className="w-4 h-4" />
                    {(performer.followers || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">followers</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
