import { useEffect, useRef } from 'react'

interface AgoraVideoProps {
  videoTrack?: any
  audioTrack?: any
  userId: string | number
  username?: string
  avatar?: string
  isMuted?: boolean
  isLocal?: boolean
}

export function AgoraVideo({
  videoTrack,
  audioTrack,
  userId,
  username,
  avatar,
  isMuted = false,
  isLocal = false
}: AgoraVideoProps) {
  const videoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (videoTrack && videoRef.current) {
      // Play video in the container
      videoTrack.play(videoRef.current)
      
      return () => {
        // Stop video when component unmounts
        try {
          videoTrack.stop()
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    }
  }, [videoTrack])

  // If no video track, show avatar
  if (!videoTrack) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-neon-gold mb-2">
            <img 
              src={avatar || `https://i.pravatar.cc/150?u=${userId}`} 
              alt={username || 'User'} 
              className="w-full h-full object-cover" 
            />
          </div>
          <p className="text-neon-gold font-bold text-sm">{username || 'User'}</p>
          <p className="text-gray-500 text-xs">{isLocal ? 'You' : 'Camera off'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-black">
      {/* Video container */}
      <div 
        ref={videoRef} 
        className="w-full h-full"
        style={{ objectFit: 'cover' }}
      />
      
      {/* User info overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <span className="bg-black/50 text-white px-2 py-1 rounded text-xs font-medium">
          {username || `User ${userId}`}
        </span>
        {isLocal && (
          <span className="bg-neon-gold/80 text-black px-2 py-1 rounded text-xs font-bold">
            You
          </span>
        )}
      </div>
      
      {/* Muted indicator */}
      {isMuted && (
        <div className="absolute top-2 right-2">
          <span className="bg-candy-red/80 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
            Muted
          </span>
        </div>
      )}
    </div>
  )
}
