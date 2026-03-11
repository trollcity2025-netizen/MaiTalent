import type { SupporterInfo } from '../lib/supabase'

interface SupporterLeaderboardProps {
  supporters: SupporterInfo[]
  maxDisplay?: number
}

export function SupporterLeaderboard({ supporters, maxDisplay = 10 }: SupporterLeaderboardProps) {
  const displaySupporters = supporters.slice(0, maxDisplay)

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700'
      case 2: return '#C0C0C0'
      case 3: return '#CD7F32'
      default: return '#95A5A6'
    }
  }

  if (displaySupporters.length === 0) {
    return (
      <div className="supporter-leaderboard empty">
        <h3>🏆 Top Supporters</h3>
        <p className="empty-message">Be the first to support! 🎁</p>
      </div>
    )
  }

  return (
    <div className="supporter-leaderboard">
      <h3>🏆 Top Supporters</h3>
      
      <div className="supporters-list">
        {displaySupporters.map((supporter) => (
          <div 
            key={supporter.user_id}
            className={`supporter-entry rank-${supporter.rank}`}
          >
            <div 
              className="supporter-rank"
              style={{ color: getRankColor(supporter.rank) }}
            >
              {getRankBadge(supporter.rank)}
            </div>
            
            <img 
              src={supporter.avatar || '/default-avatar.png'}
              alt={supporter.username}
              className="supporter-avatar"
            />
            
            <div className="supporter-info">
              <span className="supporter-username">@{supporter.username}</span>
              <span className="supporter-coins">
                💎 {supporter.total_coins.toLocaleString()} coins
              </span>
            </div>
          </div>
        ))}
      </div>

      {supporters.length > maxDisplay && (
        <div className="more-supporters">
          +{supporters.length - maxDisplay} more supporters
        </div>
      )}

      <style>{`
        .supporter-leaderboard {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 20px;
          color: white;
          border: 1px solid #2C3E50;
        }

        .supporter-leaderboard.empty {
          text-align: center;
        }

        .supporter-leaderboard h3 {
          margin: 0 0 20px 0;
          font-size: 1.2rem;
          text-align: center;
        }

        .empty-message {
          color: #BDC3C7;
          font-style: italic;
        }

        .supporters-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .supporter-entry {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .supporter-entry:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateX(5px);
        }

        .supporter-entry.rank-1 {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%);
          border: 1px solid #FFD700;
        }

        .supporter-entry.rank-2 {
          background: linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.1) 100%);
          border: 1px solid #C0C0C0;
        }

        .supporter-entry.rank-3 {
          background: linear-gradient(135deg, rgba(205, 127, 50, 0.2) 0%, rgba(205, 127, 50, 0.1) 100%);
          border: 1px solid #CD7F32;
        }

        .supporter-rank {
          font-size: 1.2rem;
          min-width: 30px;
          text-align: center;
        }

        .supporter-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }

        .supporter-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .supporter-username {
          font-weight: 600;
          color: #ECF0F1;
          font-size: 0.9rem;
        }

        .supporter-coins {
          font-size: 0.8rem;
          color: #F39C12;
        }

        .more-supporters {
          text-align: center;
          margin-top: 15px;
          font-size: 0.85rem;
          color: #BDC3C7;
        }
      `}</style>
    </div>
  )
}
