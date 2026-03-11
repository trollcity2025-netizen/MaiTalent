import React, { useEffect, useState } from 'react'
import type { PerformerWithScore } from '../lib/supabase'

interface AudienceSaveOverlayProps {
  performer: PerformerWithScore | null
  targetScore: number
  currentScore: number
  seconds: number
  onComplete?: (wasSaved: boolean) => void
}

export function AudienceSaveOverlay({ 
  performer, 
  targetScore, 
  currentScore,
  seconds, 
  onComplete 
}: AudienceSaveOverlayProps) {
  const [countdown, setCountdown] = useState(seconds)
  const [isActive, setIsActive] = useState(true)

  const progressPercentage = Math.min((currentScore / targetScore) * 100, 100)

  useEffect(() => {
    if (countdown <= 0) {
      setIsActive(false)
      const wasSaved = currentScore >= targetScore
      onComplete?.(wasSaved)
      return
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, currentScore, targetScore, onComplete])

  if (!isActive || !performer) return null

  return (
    <div className="audience-save-overlay">
      <div className="audience-save-content">
        <div className="save-header">
          <h1>⚠️ AUDIENCE SAVE ⚠️</h1>
          <p className="save-subtitle">Help save @${performer.username}!</p>
        </div>

        <div className="performer-save-card">
          <img 
            src={performer.avatar || '/default-avatar.png'} 
            alt={performer.username}
            className="save-avatar"
          />
          <div className="save-avatar-glow"></div>
        </div>

        <div className="save-progress-section">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill"
              style={{ width: `${progressPercentage}%` }}
            >
              <span className="progress-text">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
          
          <div className="score-info">
            <span className="current-score">
              💎 {currentScore.toLocaleString()} / {targetScore.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="save-countdown">
          <span className="countdown-label">SAVE COUNTDOWN:</span>
          <span className="countdown-number">{countdown}</span>
        </div>

        <div className="save-footer">
          <p>🎁 Send gifts to save! <strong>3X</strong> multiplier active!</p>
          {progressPercentage < 50 ? (
            <p className="urgent-message">🚨 WE NEED MORE VOTES! 🚨</p>
          ) : progressPercentage < 80 ? (
            <p className="close-message">🔥 ALMOST THERE! KEEP VOTING! 🔥</p>
          ) : (
            <p className="safe-message">✅ YOU'RE ALMOST SAVED! ✅</p>
          )}
        </div>
      </div>

      <style>{`
        .audience-save-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
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

        .audience-save-content {
          text-align: center;
          color: white;
          max-width: 500px;
          width: 100%;
          padding: 30px;
        }

        .save-header {
          margin-bottom: 30px;
        }

        .save-header h1 {
          font-size: 2.5rem;
          color: #E74C3C;
          margin: 0;
          text-shadow: 0 0 20px #E74C3C;
          animation: urgentPulse 0.8s infinite;
        }

        @keyframes urgentPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .save-subtitle {
          font-size: 1.5rem;
          color: #ECF0F1;
          margin: 10px 0 0 0;
        }

        .performer-save-card {
          position: relative;
          margin: 30px auto;
          width: 150px;
          height: 150px;
        }

        .save-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid #E74C3C;
          object-fit: cover;
          position: relative;
          z-index: 2;
        }

        .save-avatar-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(231, 76, 60, 0.4) 0%, transparent 70%);
          animation: saveGlow 1s infinite;
        }

        @keyframes saveGlow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
        }

        .save-progress-section {
          margin: 30px 0;
        }

        .progress-bar-container {
          width: 100%;
          height: 30px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          overflow: hidden;
          border: 2px solid #E74C3C;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #E74C3C, #F39C12);
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: width 0.3s ease;
          min-width: 30px;
        }

        .progress-text {
          font-weight: bold;
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }

        .score-info {
          margin-top: 15px;
        }

        .current-score {
          font-size: 1.2rem;
          color: #F39C12;
        }

        .save-countdown {
          margin: 30px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .countdown-label {
          font-size: 1.2rem;
          color: #BDC3C7;
          letter-spacing: 2px;
        }

        .countdown-number {
          font-size: 5rem;
          font-weight: bold;
          color: #E74C3C;
          text-shadow: 0 0 30px #E74C3C;
          animation: countdownPulse 1s infinite;
        }

        @keyframes countdownPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .save-footer {
          margin-top: 30px;
        }

        .save-footer p {
          margin: 10px 0;
          font-size: 1.1rem;
        }

        .save-footer strong {
          color: #2ECC71;
        }

        .urgent-message {
          color: #E74C3C !important;
          font-weight: bold;
          font-size: 1.3rem !important;
          animation: blink 0.5s infinite;
        }

        .close-message {
          color: #F39C12 !important;
          font-weight: bold;
          font-size: 1.2rem !important;
        }

        .safe-message {
          color: #2ECC71 !important;
          font-weight: bold;
          font-size: 1.2rem !important;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
