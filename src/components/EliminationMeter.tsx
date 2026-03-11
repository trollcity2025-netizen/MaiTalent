import React from 'react'
import type { PerformerWithScore } from '../lib/supabase'

interface EliminationMeterProps {
  performers: PerformerWithScore[]
  isSuddenDeath?: boolean
  savePerformerId?: string | null
}

export function EliminationMeter({ 
  performers, 
  isSuddenDeath = false,
  savePerformerId = null 
}: EliminationMeterProps) {
  // Sort performers by score descending
  const sortedPerformers = [...performers].sort((a, b) => b.final_score - a.final_score)
  
  // Find the lowest ranked performer (elimination risk)
  const lowestRanked = sortedPerformers[sortedPerformers.length - 1]
  const isEliminationRisk = (performer: PerformerWithScore) => 
    performer.performer_id === lowestRanked?.performer_id && !savePerformerId

  const getBarWidth = (percentage: number) => {
    return `${Math.max(percentage, 5)}%`
  }

  return (
    <div className={`elimination-meter ${isSuddenDeath ? 'sudden-death' : ''}`}>
      <div className="elimination-meter-header">
        <h3>
          {isSuddenDeath ? (
            <span className="sudden-death-title">
              ⚡ SUDDEN DEATH ⚡
            </span>
          ) : (
            '📊 Live Rankings'
          )}
        </h3>
        {isSuddenDeath && (
          <span className="sudden-death-hint">Final push for votes!</span>
        )}
      </div>

      <div className="performers-list">
        {sortedPerformers.map((performer, index) => (
          <div 
            key={performer.performer_id}
            className={`performer-entry ${isEliminationRisk(performer) ? 'elimination-risk' : ''} ${savePerformerId === performer.performer_id ? 'being-saved' : ''}`}
          >
            <div className="performer-rank">
              #{index + 1}
            </div>
            
            <div className="performer-info">
              <div className="performer-header">
                <img 
                  src={performer.avatar || '/default-avatar.png'} 
                  alt={performer.username}
                  className="performer-avatar"
                />
                <span className="performer-username">@{performer.username}</span>
                {index === 0 && <span className="leading-badge">🏆</span>}
                {isEliminationRisk(performer) && (
                  <span className="risk-badge">⚠️ ELIMINATION RISK</span>
                )}
              </div>
              
              <div className="vote-bar-container">
                <div 
                  className={`vote-bar ${isEliminationRisk(performer) ? 'risk-bar' : ''}`}
                  style={{ 
                    width: getBarWidth(performer.percentage),
                    backgroundColor: isEliminationRisk(performer) 
                      ? `linear-gradient(90deg, #E74C3C ${performer.percentage}%, #2C3E50 ${performer.percentage}%)`
                      : undefined
                  }}
                >
                  <span className="percentage">{performer.percentage}%</span>
                </div>
              </div>
              
              <div className="performer-stats">
                <span className="vote-count">
                  👍 {performer.vote_score.toLocaleString()} votes
                </span>
                <span className="gift-support">
                  💎 {(performer.gift_support / 100).toFixed(1)}K coins
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedPerformers.length > 2 && (
        <div className="elimination-info">
          <p>
            Bottom {Math.min(2, sortedPerformers.length - 1)} performers 
            are at elimination risk!
          </p>
        </div>
      )}

      <style>{`
        .elimination-meter {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 20px;
          color: white;
          border: 1px solid #2C3E50;
        }

        .elimination-meter.sudden-death {
          background: linear-gradient(135deg, #2C0B0B 0%, #1a1a2e 100%);
          border: 2px solid #E74C3C;
          animation: pulse-border 1s infinite;
        }

        @keyframes pulse-border {
          0%, 100% { border-color: #E74C3C; }
          50% { border-color: #F39C12; }
        }

        .elimination-meter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .elimination-meter-header h3 {
          margin: 0;
          font-size: 1.2rem;
        }

        .sudden-death-title {
          color: #E74C3C;
          font-weight: bold;
          animation: flash 0.5s infinite;
        }

        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .sudden-death-hint {
          font-size: 0.8rem;
          color: #F39C12;
        }

        .performers-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .performer-entry {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .performer-entry.elimination-risk {
          background: rgba(231, 76, 60, 0.2);
          border: 1px solid #E74C3C;
        }

        .performer-entry.being-saved {
          background: rgba(46, 204, 113, 0.2);
          border: 1px solid #2ECC71;
        }

        .performer-rank {
          font-size: 1.2rem;
          font-weight: bold;
          color: #F39C12;
          min-width: 30px;
        }

        .performer-info {
          flex: 1;
        }

        .performer-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .performer-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .performer-username {
          font-weight: 600;
          color: #ECF0F1;
        }

        .leading-badge {
          font-size: 1.2rem;
        }

        .risk-badge {
          font-size: 0.7rem;
          color: #E74C3C;
          font-weight: bold;
          animation: blink 0.8s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .vote-bar-container {
          margin-bottom: 8px;
        }

        .vote-bar {
          height: 24px;
          background: linear-gradient(90deg, #3498DB, #2980B9);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 10px;
          min-width: 60px;
          transition: width 0.5s ease;
        }

        .vote-bar.risk-bar {
          background: linear-gradient(90deg, #E74C3C, #C0392B);
        }

        .percentage {
          font-weight: bold;
          color: white;
          font-size: 0.85rem;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }

        .performer-stats {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #BDC3C7;
        }

        .vote-count, .gift-support {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .elimination-info {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #2C3E50;
          text-align: center;
        }

        .elimination-info p {
          margin: 0;
          font-size: 0.9rem;
          color: #F39C12;
        }
      `}</style>
    </div>
  )
}
