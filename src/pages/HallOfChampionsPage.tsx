import { Link } from 'react-router-dom'
import { useHallOfChampions } from '../hooks/useCompetition'
import type { HallOfChampion } from '../lib/supabase'
import { Crown, Trophy, Star, Calendar, ChevronRight } from 'lucide-react'

export function HallOfChampionsPage() {
  const { champions, loading } = useHallOfChampions()

  if (loading) {
    return (
      <div className="hall-of-champions-page loading">
        <div className="loading-spinner">Loading champions...</div>
      </div>
    )
  }

  const latestChampion = champions.length > 0 ? champions[0] : null
  const previousChampions = champions.length > 1 ? champions.slice(1) : []

  return (
    <div className="hall-of-champions-page">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Crown className="w-10 h-10 text-neon-gold" />
          <h1>Hall of Champions</h1>
        </div>
        <p>Every month, one performer rises to claim the crown</p>
      </div>

      {champions.length === 0 ? (
        <div className="no-champions">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-xl text-gray-400 mb-2">No champions yet</p>
          <p className="text-gray-500">Be the first to claim the Mai Talent crown!</p>
        </div>
      ) : (
        <>
          {/* Featured Champion */}
          {latestChampion && (
            <FeaturedChampion champion={latestChampion} />
          )}

          {/* Previous Champions Grid */}
          {previousChampions.length > 0 && (
            <div className="previous-champions">
              <div className="section-header">
                <Star className="w-6 h-6 text-neon-gold" />
                <h2>Previous Champions</h2>
              </div>
              
              <div className="champions-grid">
                {previousChampions.map((champion) => (
                  <ChampionCard 
                    key={champion.id} 
                    champion={champion} 
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* How It Works Section */}
      <div className="how-it-works">
        <h3>🏆 How to Become a Champion</h3>
        <div className="steps-grid">
          <div className="step">
            <div className="step-number">1</div>
            <h4>Join the Season</h4>
            <p>Apply during auditions for the monthly competition season</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h4>Compete Rounds</h4>
            <p>Advance through quarter finals, semi finals, and finals</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h4>Earn Support</h4>
            <p>Get votes and gifts from your audience to climb the leaderboard</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h4>Win the Crown</h4>
            <p>Claim victory and become a Mai Talent Champion</p>
          </div>
        </div>
      </div>

      <style>{`
        .hall-of-champions-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .page-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .page-header h1 {
          font-size: 2.5rem;
          color: #FFD700;
          margin: 0;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
          display: inline;
        }

        .page-header p {
          color: #BDC3C7;
          font-size: 1.1rem;
          margin: 10px 0 0 0;
        }

        .no-champions {
          text-align: center;
          padding: 60px 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
        }

        /* Featured Champion Styles */
        .featured-champion {
          margin-bottom: 50px;
        }

        .featured-label {
          text-align: center;
          margin-bottom: 20px;
        }

        .featured-label span {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #1a1a2e;
          padding: 8px 24px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .featured-card {
          background: linear-gradient(135deg, #2a2a1e 0%, #1e2a1e 100%);
          border: 3px solid #FFD700;
          border-radius: 24px;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }

        .featured-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 50% 0%, rgba(255, 215, 0, 0.2), transparent 70%);
          pointer-events: none;
        }

        .featured-content {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 40px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .featured-avatar-section {
          text-align: center;
        }

        .featured-crown {
          font-size: 4rem;
          margin-bottom: 10px;
          display: block;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .featured-avatar {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          border: 5px solid #FFD700;
          object-fit: cover;
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        }

        .featured-info {
          text-align: left;
        }

        .featured-title {
          font-size: 1rem;
          color: #FFD700;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 10px;
        }

        .featured-username {
          font-size: 3rem;
          font-weight: bold;
          color: white;
          margin-bottom: 10px;
        }

        .featured-season {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #BDC3C7;
          font-size: 1.2rem;
          margin-bottom: 20px;
        }

        .featured-stats {
          display: flex;
          gap: 30px;
        }

        .featured-stat {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 15px 25px;
          text-align: center;
        }

        .featured-stat-value {
          font-size: 1.8rem;
          font-weight: bold;
          color: #FFD700;
        }

        .featured-stat-label {
          font-size: 0.85rem;
          color: #BDC3C7;
          margin-top: 4px;
        }

        .featured-profile-btn {
          margin-top: 25px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #1a1a2e;
          padding: 12px 24px;
          border-radius: 30px;
          font-weight: bold;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .featured-profile-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }

        /* Previous Champions */
        .previous-champions {
          margin-top: 50px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 30px;
        }

        .section-header h2 {
          font-size: 1.8rem;
          color: white;
          margin: 0;
        }

        .champions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 25px;
        }

        .champion-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 25px;
          border: 2px solid #2C3E50;
          transition: all 0.3s ease;
          text-decoration: none;
          display: block;
        }

        .champion-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          border-color: #FFD700;
        }

        .champion-card-header {
          display: flex;
          align-items: center;
          justify-between;
          margin-bottom: 15px;
        }

        .champion-card-season {
          background: #3498DB;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
        }

        .champion-card-crown {
          font-size: 1.5rem;
        }

        .champion-card-body {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .champion-card-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 3px solid #FFD700;
          object-fit: cover;
        }

        .champion-card-name {
          font-size: 1.3rem;
          font-weight: bold;
          color: #FFD700;
        }

        /* How It Works */
        .how-it-works {
          margin-top: 60px;
          text-align: center;
          padding: 40px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
        }

        .how-it-works h3 {
          font-size: 1.5rem;
          color: white;
          margin-bottom: 30px;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .step {
          padding: 20px;
        }

        .step-number {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
          color: #1a1a2e;
          margin: 0 auto 15px;
        }

        .step h4 {
          color: white;
          margin-bottom: 8px;
        }

        .step p {
          color: #BDC3C7;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .featured-content {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .featured-info {
            text-align: center;
          }

          .featured-stats {
            justify-content: center;
            flex-wrap: wrap;
          }

          .steps-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

function FeaturedChampion({ champion }: { champion: HallOfChampion }) {
  return (
    <div className="featured-champion">
      <div className="featured-label">
        <span>👑 Current Champion</span>
      </div>
      
      <div className="featured-card">
        <div className="featured-content">
          <div className="featured-avatar-section">
            <span className="featured-crown">👑</span>
            <img 
              src={`/avatars/${champion.champion_user_id}.png`} 
              alt={champion.champion_name}
              className="featured-avatar"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/default-avatar.png'
              }}
            />
          </div>
          
          <div className="featured-info">
            <p className="featured-title">Mai Talent Champion</p>
            <h2 className="featured-username">@{champion.champion_name}</h2>
            
            <div className="featured-season">
              <Calendar className="w-5 h-5" />
              <span>Season: {champion.champion_name.split(' ')[0] || 'Champion'}</span>
            </div>
            
            <div className="featured-stats">
              <div className="featured-stat">
                <div className="featured-stat-value">{champion.total_votes.toLocaleString()}</div>
                <div className="featured-stat-label">Final Votes</div>
              </div>
              <div className="featured-stat">
                <div className="featured-stat-value">💎{(champion.total_gift_coins / 1000).toFixed(1)}K</div>
                <div className="featured-stat-label">Gift Support</div>
              </div>
            </div>
            
            <Link 
              to={`/profile/${champion.champion_user_id}`}
              className="featured-profile-btn"
            >
              View Profile <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChampionCard({ champion }: { champion: HallOfChampion }) {
  return (
    <Link to={`/profile/${champion.champion_user_id}`} className="champion-card">
      <div className="champion-card-header">
        <span className="champion-card-crown">👑</span>
        <span className="champion-card-season">
          {champion.champion_name.split(' ')[0] || 'Season'}
        </span>
      </div>
      
      <div className="champion-card-body">
        <img 
          src={`/avatars/${champion.champion_user_id}.png`} 
          alt={champion.champion_name}
          className="champion-card-avatar"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/default-avatar.png'
          }}
        />
        <span className="champion-card-name">@{champion.champion_name}</span>
      </div>
    </Link>
  )
}
