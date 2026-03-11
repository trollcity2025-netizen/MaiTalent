import React, { useState } from 'react'

interface VoteButtonProps {
  onVote: () => void
  hasVoted: boolean
  loading?: boolean
  disabled?: boolean
}

export function VoteButton({ 
  onVote, 
  hasVoted, 
  loading = false,
  disabled = false 
}: VoteButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = async () => {
    if (hasVoted || disabled || loading) return
    
    setIsAnimating(true)
    await onVote()
    setTimeout(() => setIsAnimating(false), 500)
  }

  return (
    <button
      className={`vote-button ${hasVoted ? 'voted' : ''} ${isAnimating ? 'animating' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      disabled={hasVoted || disabled || loading}
    >
      {loading ? (
        <span className="loading">Voting...</span>
      ) : hasVoted ? (
        <span className="voted-text">✓ Voted</span>
      ) : (
        <>
          <span className="vote-icon">👍</span>
          <span className="vote-text">Vote</span>
        </>
      )}

      <style>{`
        .vote-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 40px;
          border: none;
          border-radius: 30px;
          background: linear-gradient(135deg, #3498DB, #2980B9);
          color: white;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
          min-width: 150px;
        }

        .vote-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(52, 152, 219, 0.6);
        }

        .vote-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .vote-button.animating {
          animation: voteAnimation 0.5s ease;
        }

        @keyframes voteAnimation {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .vote-button.voted {
          background: linear-gradient(135deg, #2ECC71, #27AE60);
          cursor: default;
        }

        .vote-button.disabled {
          background: #7F8C8D;
          cursor: not-allowed;
          box-shadow: none;
        }

        .vote-icon {
          font-size: 1.4rem;
        }

        .vote-text {
          font-weight: bold;
        }

        .voted-text {
          font-weight: bold;
        }

        .loading {
          font-weight: bold;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </button>
  )
}
