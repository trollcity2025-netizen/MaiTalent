import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff } from 'lucide-react'

interface VideoControlsProps {
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onLeave: () => void
}

export function VideoControls({
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onLeave
}: VideoControlsProps) {
  return (
    <div className="glass-dark rounded-xl p-4">
      <div className="flex items-center justify-center gap-4">
        {/* Microphone */}
        <button
          onClick={onToggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isMuted 
              ? 'bg-candy-red neon-glow-red' 
              : 'glass hover:bg-white/10'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera */}
        <button
          onClick={onToggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isVideoOff 
              ? 'bg-candy-red neon-glow-red' 
              : 'glass hover:bg-white/10'
          }`}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={onToggleScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isScreenSharing 
              ? 'bg-neon-purple neon-glow-purple' 
              : 'glass hover:bg-white/10'
          }`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Leave */}
        <button
          onClick={onLeave}
          className="w-12 h-12 rounded-full bg-candy-red hover:bg-candy-red-dark flex items-center justify-center neon-glow-red"
          title="Leave stage"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
