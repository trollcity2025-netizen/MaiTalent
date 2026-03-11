import { useState } from 'react'
import type { GiftType } from '../lib/supabase'

interface GiftPanelProps {
  giftTypes: GiftType[]
  userCoins: number
  onSendGift: (gift: GiftType) => void
  sending?: boolean
  multiplier?: 'normal' | 'sudden_death' | 'save'
  disabled?: boolean
}

export function GiftPanel({ 
  giftTypes, 
  userCoins, 
  onSendGift, 
  sending = false,
  multiplier = 'normal',
  disabled = false
}: GiftPanelProps) {
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null)
  const [quantity, setQuantity] = useState(1)

  const getMultiplierBadge = () => {
    switch (multiplier) {
      case 'sudden_death':
        return <span className="multiplier-badge sudden-death">2X</span>
      case 'save':
        return <span className="multiplier-badge save">3X</span>
      default:
        return null
    }
  }

  const getRarityStyle = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return { borderColor: '#FFD700', boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }
      case 'epic':
        return { borderColor: '#9B59B6', boxShadow: '0 0 10px rgba(155, 89, 182, 0.5)' }
      case 'rare':
        return { borderColor: '#3498DB', boxShadow: '0 0 10px rgba(52, 152, 219, 0.5)' }
      case 'uncommon':
        return { borderColor: '#2ECC71', boxShadow: '0 0 10px rgba(46, 204, 113, 0.5)' }
      default:
        return {}
    }
  }

  const handleSend = () => {
    if (selectedGift && !disabled && !sending) {
      onSendGift(selectedGift)
      setQuantity(1)
    }
  }

  const totalCost = selectedGift ? selectedGift.coin_cost * quantity : 0
  const canAfford = totalCost <= userCoins

  // Group gifts by rarity
  const groupedGifts = giftTypes.reduce((acc, gift) => {
    if (!acc[gift.rarity]) acc[gift.rarity] = []
    acc[gift.rarity].push(gift)
    return acc
  }, {} as Record<string, GiftType[]>)

  const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common']

  return (
    <div className={`gift-panel ${disabled ? 'disabled' : ''}`}>
      <div className="gift-panel-header">
        <h3>🎁 Send Gifts</h3>
        <div className="coin-balance">
          💎 {userCoins.toLocaleString()}
        </div>
        {getMultiplierBadge()}
      </div>

      <div className="gift-grid">
        {rarityOrder.map(rarity => 
          groupedGifts[rarity]?.map(gift => (
            <button
              key={gift.id}
              className={`gift-item ${selectedGift?.id === gift.id ? 'selected' : ''}`}
              style={getRarityStyle(gift.rarity)}
              onClick={() => setSelectedGift(gift)}
              disabled={disabled || gift.coin_cost > userCoins}
            >
              <span className="gift-emoji">{gift.emoji}</span>
              <span className="gift-name">{gift.name}</span>
              <span className="gift-cost">💎{gift.coin_cost}</span>
            </button>
          ))
        )}
      </div>

      {selectedGift && (
        <div className="gift-selection">
          <div className="quantity-selector">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              -
            </button>
            <span>{quantity}</span>
            <button 
              onClick={() => setQuantity(Math.min(10, quantity + 1))}
              disabled={quantity >= 10}
            >
              +
            </button>
          </div>

          <div className="gift-summary">
            <span>Total: 💎{totalCost.toLocaleString()}</span>
            <span className={canAfford ? 'can-afford' : 'cannot-afford'}>
              {canAfford ? '✓' : 'Insufficient coins'}
            </span>
          </div>

          <button 
            className="send-gift-btn"
            onClick={handleSend}
            disabled={!canAfford || sending || disabled}
          >
            {sending ? 'Sending...' : `Send ${quantity}x ${selectedGift.emoji}`}
          </button>
        </div>
      )}

      <style>{`
        .gift-panel {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 20px;
          color: white;
          border: 1px solid #2C3E50;
        }

        .gift-panel.disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        .gift-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .gift-panel-header h3 {
          margin: 0;
          font-size: 1.2rem;
        }

        .coin-balance {
          font-size: 1.1rem;
          color: #F39C12;
          font-weight: bold;
        }

        .multiplier-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.9rem;
          animation: pulse 1s infinite;
        }

        .multiplier-badge.sudden-death {
          background: #E74C3C;
          color: white;
        }

        .multiplier-badge.save {
          background: #2ECC71;
          color: white;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .gift-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .gift-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .gift-item:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .gift-item.selected {
          background: rgba(52, 152, 219, 0.3);
          border-color: #3498DB;
        }

        .gift-item:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .gift-emoji {
          font-size: 1.8rem;
          margin-bottom: 5px;
        }

        .gift-name {
          font-size: 0.75rem;
          color: #ECF0F1;
          margin-bottom: 5px;
          text-align: center;
        }

        .gift-cost {
          font-size: 0.75rem;
          color: #F39C12;
          font-weight: bold;
        }

        .gift-selection {
          border-top: 1px solid #2C3E50;
          padding-top: 20px;
        }

        .quantity-selector {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          margin-bottom: 15px;
        }

        .quantity-selector button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #3498DB;
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .quantity-selector button:hover:not(:disabled) {
          background: #2980B9;
        }

        .quantity-selector button:disabled {
          background: #7F8C8D;
          cursor: not-allowed;
        }

        .quantity-selector span {
          font-size: 1.5rem;
          font-weight: bold;
          min-width: 40px;
          text-align: center;
        }

        .gift-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          font-size: 1rem;
        }

        .can-afford {
          color: #2ECC71;
        }

        .cannot-afford {
          color: #E74C3C;
        }

        .send-gift-btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #3498DB, #2980B9);
          color: white;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .send-gift-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #2980B9, #1f6dad);
          transform: translateY(-2px);
        }

        .send-gift-btn:disabled {
          background: #7F8C8D;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .gift-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  )
}
