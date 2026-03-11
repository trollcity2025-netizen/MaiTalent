import { useEffect, useState } from 'react'
import type { PerformerWithScore } from '../lib/supabase'

interface SuddenDeathOverlayProps {
  performers: PerformerWithScore[]
  seconds: number
  onComplete?: () => void
}

export function SuddenDeathOverlay({ performers, seconds, onComplete }: SuddenDeathOverlayProps) {
  const [countdown, setCountdown] = useState(seconds)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (countdown <= 0) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => {
        setIsActive(false)
        onComplete?.()
      })
      return () => cancelAnimationFrame(timeoutId)
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, onComplete])

  // Calculate animated percentages
  const totalScore = performers.reduce((sum, p) => sum + p.final_score, 0)
  const animatedPercentages = performers.map(p => ({
    ...p,
    displayPercentage: totalScore > 0 
      ? Math.round((p.final_score / totalScore) * 100)
      : 0
  }))

  if (!isActive) return null

  return (
    <div className="sudden-death-overlay">
      <div className="sudden-death-content">
        <div className="sudden-death-header">
          <h1>⚡ SUDDEN DEATH ⚡</h1>
          <p className="countdown">{countdown}</p>
          <p className="hint">Last chance to vote!</p>
        </div>

        <div className="performers-battle">
          {animatedPercentages.map((performer, index) => (
            <div 
              key={performer.performer_id}
              className={`battle-performer ${index === 0 ? 'leading' : 'trailing'}`}
            >
              <div className="performer-visual">
                <img 
                  src={performer.avatar || '/default-avatar.png'} 
                  alt={performer.username}
                  className="battle-avatar"
                />
                <div className="performer-glow"></div>
              </div>
              
              <div className="performer-details">
                <span className="battle-username">@{performer.username}</span>
                
                <div className="battle-bar-container">
                  <div 
                    className={`battle-bar ${index === 0 ? 'leading-bar' : 'trailing-bar'}`}
                    style={{ width: `${performer.displayPercentage}%` }}
                  >
                    <span className="battle-percentage">
                      {performer.displayPercentage}%
                    </span>
                  </div>
                </div>
                
                <div className="battle-stats">
                  <span>👍 {performer.vote_score.toLocaleString()}</span>
                  <span>💎 {(performer.gift_support / 100).toFixed(1)}K</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sudden-death-footer">
          <p>🎁 Gift values are <strong>2X</strong> during Sudden Death!</p>
        </div>
      </div>

      <style>{`
        .sudden-death-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .sudden-death-content {
          text-align: center;
          color: white;
          max-width: 800px;
          width: 100%;
          padding: 20px;
        }

        .sudden-death-header {
          margin-bottom: 40px;
        }

        .sudden-death-header h1 {
          font-size: 3rem;
          color: #E74C3C;
          margin: 0;
          text-shadow: 0 0 20px #E74C3C;
          animation: pulse 0.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .countdown {
          font-size: 8rem;
          font-weight: bold;
          color: #F39C12;
          margin: 20px 0;
          text-shadow: 0 0 30px #F39C12;
          animation: countdownPulse 1s infinite;
        }

        @keyframes countdownPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        .hint {
          font-size: 1.2rem;
          color: #ECF0F1;
          margin: 0;
        }

        .performers-battle {
          display: flex;
          justify-content: center;
          gap: 60px;
          margin: 40px 0;
        }

        .battle-performer {
          flex: 1;
          max-width: 300px;
          padding: 20px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
        }

        .battle-performer.leading {
          border: 2px solid #F39C12;
          box-shadow: 0 0 30px rgba(243, 156, 18, 0.3);
        }

        .battle-performer.trailing {
          border: 2px solid #E74C3C;
          animation: trailingPulse 1s infinite;
        }

        @keyframes trailingPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(231, 76, 60, 0.3); }
          50% { box-shadow: 0 0 40px rgba(231, 76, 60, 0.5); }
        }

        .performer-visual {
          position: relative;
          margin-bottom: 20px;
        }

        .battle-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 3px solid #fff;
          object-fit: cover;
        }

        .performer-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
          animation: glow 2s infinite;
        }

        @keyframes glow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
        }

        .performer-details {
          text-align: center;
        }

        .battle-username {
          display: block;
          font-size: 1.3rem;
          font-weight: bold;
          color: #ECF0F1;
          margin-bottom: 15px;
        }

        .battle-bar-container {
          width: 100%;
          height: 40px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .battle-bar {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          transition: width 0.5s ease;
          min-width: 50px;
        }

        .leading-bar {
          background: linear-gradient(90deg, #F39C12, #E67E22);
        }

        .trailing-bar {
          background: linear-gradient(90deg, #E74C3C, #C0392B);
        }

        .battle-percentage {
          font-size: 1.2rem;
          font-weight: bold;
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }

        .battle-stats {
          display: flex;
          justify-content: center;
          gap: 20px;
          font-size: 0.9rem;
          color: #BDC3C7;
        }

        .battle-stats span {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .sudden-death-footer {
          margin-top: 40px;
        }

        .sudden-death-footer p {
          font-size: 1.1rem;
          color: #F39C12;
          margin: 0;
        }

        .sudden-death-footer strong {
          color: #2ECC71;
        }
      `}</style>
    </div>
  )
}
