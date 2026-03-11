import { Flame, Zap, Timer, Sparkles } from 'lucide-react'

interface CrowdBoostOverlayProps {
  isActive: boolean
  multiplier: number
  remainingSeconds: number
  performerName?: string
  onClose?: () => void
}

export function CrowdBoostOverlay({ 
  isActive, 
  multiplier, 
  remainingSeconds,
  performerName 
}: CrowdBoostOverlayProps) {
  // Progress decreases as time runs out (derived state)
  const maxDuration = 25 // Maximum boost duration in seconds
  const progress = isActive && remainingSeconds > 0 
    ? Math.max(0, Math.min(100, (remainingSeconds / maxDuration) * 100))
    : 100

  if (!isActive) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Stage lighting effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/20 via-red-500/10 to-transparent animate-pulse" />
      
      {/* Main boost banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 transform">
        <div className="glass border-2 border-orange-500 rounded-2xl p-4 min-w-[300px] text-center relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 via-red-500/20 to-orange-500/30 animate-pulse" />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Flame className="w-8 h-8 text-orange-500 animate-bounce" />
              <span className="text-2xl animate-pulse">🔥</span>
              <span className="text-2xl">CROWD BOOST</span>
              <span className="text-2xl animate-pulse">🔥</span>
              <Flame className="w-8 h-8 text-orange-500 animate-bounce" />
            </div>
            
            <p className="text-orange-400 font-bold text-lg mb-2">
              {multiplier}x Support Multiplier
            </p>
            
            {performerName && (
              <p className="text-white text-sm mb-2">
                for <span className="font-bold text-neon-yellow">@{performerName}</span>
              </p>
            )}
            
            {/* Timer */}
            <div className="flex items-center justify-center gap-2">
              <Timer className="w-5 h-5 text-orange-400" />
              <span className="text-white font-mono text-xl">
                {remainingSeconds}s
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-black/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          {/* Sparkle effects */}
          <div className="absolute top-2 left-2">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-ping" />
          </div>
          <div className="absolute top-2 right-2">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-ping" />
          </div>
          <div className="absolute bottom-2 left-2">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-ping" />
          </div>
          <div className="absolute bottom-2 right-2">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-ping" />
          </div>
        </div>
      </div>
      
      {/* Side indicators */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center gap-2">
          <Zap className={`w-8 h-8 ${multiplier >= 3 ? 'text-yellow-400' : 'text-orange-400'} animate-pulse`} />
          <span className="text-orange-400 font-bold text-lg">{multiplier}x</span>
        </div>
      </div>
    </div>
  )
}

// Compact version for embedding in other components
export function CrowdBoostIndicator({ 
  isActive, 
  multiplier, 
  remainingSeconds 
}: {
  isActive: boolean
  multiplier: number
  remainingSeconds: number
}) {
  if (!isActive) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-500/30 to-red-500/30 rounded-full border border-orange-500/50">
      <Flame className="w-5 h-5 text-orange-500 animate-bounce" />
      <span className="text-orange-400 font-bold">
        {multiplier}x BOOST
      </span>
      <span className="text-white font-mono text-sm">
        {remainingSeconds}s
      </span>
    </div>
  )
}
