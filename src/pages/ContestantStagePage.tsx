import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Settings, Play, Pause } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export function ContestantStagePage() {
  const navigate = useNavigate()
  const { setViewerCount } = useAppStore()
  
  const [isPerforming, setIsPerforming] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const localVideoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setViewerCount(0)
  }, [setViewerCount])

  const handleToggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleToggleCamera = () => {
    setIsCameraOn(!isCameraOn)
  }

  const handleStartPerformance = () => {
    setIsPerforming(true)
  }

  const handleEndPerformance = () => {
    setIsPerforming(false)
  }

  const handleLeaveStage = () => {
    navigate('/')
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Contestant Stage</h1>
          {isPerforming && (
            <span className="live-badge pulse-live flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full"></span>
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-neon-yellow">
            <Users className="w-5 h-5" />
            2 on stage
          </span>
        </div>
      </div>

      {/* Main Stage Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-0">
        {/* Local Video (Current Performer) */}
        <div className="relative aspect-video rounded-xl overflow-hidden neon-border-gold bg-black">
          {isCameraOn ? (
            <div ref={localVideoRef} className="w-full h-full bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-2 rounded-full overflow-hidden border-2 border-neon-gold">
                  <img src="https://i.pravatar.cc/150?u=current" alt="You" className="w-full h-full object-cover" />
                </div>
                <p className="text-neon-gold font-bold">You</p>
                <p className="text-xs text-gray-400">Performing now</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <VideoOff className="w-16 h-16 text-gray-600" />
            </div>
          )}
          
          {/* Status indicators */}
          <div className="absolute top-2 left-2 flex items-center gap-2">
            {isMuted && <span className="bg-candy-red px-2 py-1 rounded text-xs"><MicOff className="w-3 h-3 inline" /></span>}
            <span className="bg-neon-gold/20 text-neon-gold px-2 py-1 rounded text-xs">You</span>
          </div>
          
          {/* Performance status */}
          {isPerforming && (
            <div className="absolute top-2 right-2">
              <span className="live-badge">LIVE</span>
            </div>
          )}
        </div>

        {/* Host Video */}
        <div className="relative aspect-video rounded-xl overflow-hidden glass border border-white/10 bg-black">
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-2 rounded-full overflow-hidden border-2 border-candy-red">
                <img src="https://i.pravatar.cc/150?u=host" alt="Host" className="w-full h-full object-cover" />
              </div>
              <p className="text-candy-red font-bold">Host</p>
              <p className="text-xs text-gray-400">Show Host</p>
            </div>
          </div>
          <div className="absolute top-2 left-2">
            <span className="bg-candy-red/20 text-candy-red px-2 py-1 rounded text-xs">Host</span>
          </div>
        </div>

        {/* Judge Panel Placeholders */}
        <div className="relative aspect-video rounded-xl overflow-hidden glass border border-white/10 bg-black">
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Waiting for judge...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="mt-4 glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          {/* Left - Performer info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full avatar-ring overflow-hidden">
              <img src="https://i.pravatar.cc/150?u=current" alt="You" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-neon-gold">You</h3>
              <p className="text-sm text-gray-400">Dance • Performer</p>
            </div>
          </div>

          {/* Center - Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isMuted 
                  ? 'bg-candy-red neon-glow-red' 
                  : 'glass hover:bg-white/10'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleToggleCamera}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                !isCameraOn 
                  ? 'bg-candy-red neon-glow-red' 
                  : 'glass hover:bg-white/10'
              }`}
            >
              {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {!isPerforming ? (
              <button
                onClick={handleStartPerformance}
                className="btn-neon-red px-6 py-3 rounded-full flex items-center gap-2 neon-glow-red"
              >
                <Play className="w-5 h-5" />
                Start Performance
              </button>
            ) : (
              <button
                onClick={handleEndPerformance}
                className="btn-neon-gold px-6 py-3 rounded-full flex items-center gap-2 neon-glow-gold"
              >
                <Pause className="w-5 h-5" />
                End Performance
              </button>
            )}

            <button className="w-12 h-12 rounded-full glass hover:bg-white/10 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={handleLeaveStage}
              className="w-12 h-12 rounded-full bg-candy-red hover:bg-candy-red-dark flex items-center justify-center neon-glow-red"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>

          {/* Right - Queue info */}
          <div className="hidden md:block">
            <p className="text-sm text-gray-400 mb-2">Queue: 2 performers</p>
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-black overflow-hidden">
                <img src="https://i.pravatar.cc/150?u=2" alt="Next" className="w-full h-full object-cover" />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-black overflow-hidden">
                <img src="https://i.pravatar.cc/150?u=3" alt="Next" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
