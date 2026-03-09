import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Play, Settings, Plus, Award, Video } from 'lucide-react'

interface Performance {
  id: string
  title: string
  thumbnail: string
  views: number
  date: string
}

interface Achievement {
  id: string
  name: string
  icon: string
  date: string
}

const mockProfile = {
  id: '1',
  username: 'DancingQueen',
  avatar: 'https://i.pravatar.cc/300?u=1',
  bio: 'Professional dancer with 10+ years of experience. Passionate about spreading joy through dance! 💃✨',
  talent_category: 'Dance',
  followers: 25000,
  following: 150,
  total_views: 500000,
}

const mockPerformances: Performance[] = [
  { id: '1', title: 'Summer Dance-off 2026', thumbnail: 'https://picsum.photos/seed/perf1/320/180', views: 50000, date: '2026-03-01' },
  { id: '2', title: 'Street Style Showcase', thumbnail: 'https://picsum.photos/seed/perf2/320/180', views: 35000, date: '2026-02-15' },
  { id: '3', title: 'Contemporary Flow', thumbnail: 'https://picsum.photos/seed/perf3/320/180', views: 28000, date: '2026-01-20' },
]

const mockAchievements: Achievement[] = [
  { id: '1', name: 'Top 10 Performer', icon: '🏆', date: '2026-02-01' },
  { id: '2', name: '100K Views', icon: '👁️', date: '2026-01-15' },
  { id: '3', name: 'Verified Artist', icon: '✅', date: '2025-12-01' },
]

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'performances' | 'clips' | 'achievements' | 'followers'>('performances')
  const isOwnProfile = true // Would be determined by auth state

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-candy-red/30 to-neon-gold/30 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiIC8+PC9zdmc+')] opacity-30"></div>
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 relative z-10">
            <div className="w-24 h-24 rounded-full border-4 border-black overflow-hidden neon-glow-gold">
              <img src={mockProfile.avatar} alt={mockProfile.username} className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-bold">@{mockProfile.username}</h1>
                <span className="gold-badge">Verified</span>
              </div>
              <p className="text-neon-yellow">{mockProfile.talent_category}</p>
            </div>

            {isOwnProfile && (
              <Link
                to="/settings"
                className="btn-neon-gold px-4 py-2 rounded-full flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Edit Profile
              </Link>
            )}
          </div>

          {/* Bio */}
          <p className="mt-4 text-gray-300 text-center sm:text-left">{mockProfile.bio}</p>

          {/* Stats */}
          <div className="flex justify-center sm:justify-start gap-8 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-neon-yellow">{mockProfile.followers.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{mockProfile.following.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Following</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-candy-red">{mockProfile.total_views.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Total Views</p>
            </div>
          </div>

          {/* Follow Button */}
          {!isOwnProfile && (
            <div className="flex justify-center sm:justify-start gap-2 mt-4">
              <button className="btn-neon-red px-8 py-2 rounded-full">
                Follow
              </button>
              <button className="glass px-4 py-2 rounded-full hover:bg-white/10">
                Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'performances', label: 'Performances', icon: Play },
          { id: 'clips', label: 'Clips', icon: Video },
          { id: 'achievements', label: 'Achievements', icon: Award },
          { id: 'followers', label: 'Followers', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'btn-neon-red'
                : 'glass hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'performances' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockPerformances.map((performance) => (
            <Link
              key={performance.id}
              to={`/performance/${performance.id}`}
              className="glass rounded-xl overflow-hidden card-neon-hover"
            >
              <div className="relative aspect-video">
                <img
                  src={performance.thumbnail}
                  alt={performance.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Play className="w-12 h-12 text-neon-yellow" fill="currentColor" />
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-white truncate">{performance.title}</h3>
                <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
                  <span>{performance.views.toLocaleString()} views</span>
                  <span>{new Date(performance.date).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
          
          {/* Add More */}
          <Link
            to="/audition"
            className="glass rounded-xl aspect-video flex flex-col items-center justify-center text-gray-400 hover:text-neon-yellow transition-colors"
          >
            <Plus className="w-12 h-12 mb-2" />
            <span>Submit Audition</span>
          </Link>
        </div>
      )}

      {activeTab === 'clips' && (
        <div className="text-center py-12 text-gray-400">
          <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No clips yet</p>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockAchievements.map((achievement) => (
            <div key={achievement.id} className="glass rounded-xl p-4 flex items-center gap-4">
              <span className="text-4xl">{achievement.icon}</span>
              <div>
                <h3 className="font-bold text-white">{achievement.name}</h3>
                <p className="text-sm text-gray-400">{new Date(achievement.date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'followers' && (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No followers yet</p>
        </div>
      )}
    </div>
  )
}
