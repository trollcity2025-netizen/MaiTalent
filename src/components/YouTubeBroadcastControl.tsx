import { useState } from 'react'
import { useYouTubeSettings, useShowYouTubeBroadcast, useYouTubeStreamStatus } from '../hooks/useYouTubeBroadcast'
import { Youtube, Radio, Settings, Play, Square, ExternalLink, Copy, Check } from 'lucide-react'

interface YouTubeBroadcastControlProps {
  showId: string
}

export function YouTubeBroadcastControl({ showId }: YouTubeBroadcastControlProps) {
  const { settings, loading: settingsLoading, updateSettings } = useYouTubeSettings()
  const { 
    loading: showLoading, 
    startBroadcast, 
    endBroadcast,
    isBroadcasting,
    streamUrl,
    streamKey 
  } = useShowYouTubeBroadcast(showId)
  
  const [showSettings, setShowSettings] = useState(false)
  const [channelId, setChannelId] = useState('')
  const [streamKeyInput, setStreamKeyInput] = useState('')
  const [promoEnabled, setPromoEnabled] = useState(true)
  const [promoInterval, setPromoInterval] = useState(60)
  const [promoMessage, setPromoMessage] = useState('Join the interactive show at MaiTalent.fun to vote and send gifts.')
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const [copied, setCopied] = useState(false)

  // Initialize local state from settings when settings load
  const initFromSettings = () => {
    if (settings) {
      setChannelId(settings.channel_id || '')
      setStreamKeyInput(settings.stream_key || '')
      setPromoEnabled(settings.chat_promo_enabled)
      setPromoInterval(settings.chat_promo_interval_seconds || 60)
      setPromoMessage(settings.chat_promo_message || 'Join the interactive show at MaiTalent.fun to vote and send gifts.')
    }
  }

  const handleStartBroadcast = async () => {
    setStarting(true)
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const title = `Mai Talent Live Show – ${today}`
    const description = `Watch live performances on MaiTalent.fun! Join the interactive show to vote and send gifts.`

    const result = await startBroadcast(title, description, 'public')
    setStarting(false)
    
    if (!result.success) {
      alert(`Failed to start broadcast: ${result.error}`)
    }
  }

  const handleEndBroadcast = async () => {
    if (!confirm('Are you sure you want to end the broadcast? The YouTube stream will be kept as a replay.')) {
      return
    }

    setEnding(true)
    const result = await endBroadcast()
    setEnding(false)

    if (!result.success) {
      alert(`Failed to end broadcast: ${result.error}`)
    }
  }

  const handleSaveSettings = async () => {
    const result = await updateSettings(
      channelId,
      streamKeyInput,
      promoEnabled,
      promoInterval,
      promoMessage
    )

    if (result.success) {
      setShowSettings(false)
      alert('Settings saved!')
    } else {
      alert(`Failed to save settings: ${result.error}`)
    }
  }

  const copyStreamKey = () => {
    if (streamKey) {
      navigator.clipboard.writeText(streamKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (settingsLoading || showLoading) {
    return (
      <div className="bg-gray-900 rounded-xl p-4">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded w-32"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Youtube className="w-6 h-6 text-red-500" />
          <h3 className="font-semibold text-white">YouTube Broadcast</h3>
        </div>
        
        {isBroadcasting && (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            LIVE
          </span>
        )}
      </div>

      {/* Stream Info */}
      {isBroadcasting && streamUrl && (
        <div className="bg-black/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Stream URL</span>
            <button
              onClick={() => window.open(streamUrl, '_blank')}
              className="text-sm text-neon-yellow hover:text-neon-gold flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              View on YouTube
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-gray-800 px-3 py-2 rounded truncate text-gray-300">
              {streamUrl}
            </code>
            <button
              onClick={copyStreamKey}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              title="Copy stream URL"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {streamKey && (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-800 px-3 py-2 rounded text-gray-300">
                Stream Key: {streamKey}
              </code>
              <button
                onClick={copyStreamKey}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                title="Copy stream key"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {!isBroadcasting ? (
          <button
            onClick={handleStartBroadcast}
            disabled={starting || !settings?.channel_id}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {starting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Broadcast
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleEndBroadcast}
            disabled={ending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {ending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Ending...
              </>
            ) : (
              <>
                <Square className="w-4 h-4" />
                End Broadcast
              </>
            )}
          </button>
        )}

        <button
          onClick={() => {
            initFromSettings()
            setShowSettings(!showSettings)
          }}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-t border-gray-700 pt-4 space-y-4">
          <h4 className="font-medium text-white">YouTube Settings</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">YouTube Channel ID</label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="UC..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Stream Key</label>
              <input
                type="text"
                value={streamKeyInput}
                onChange={(e) => setStreamKeyInput(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="Your stream key"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Chat Promo Messages</span>
              <button
                onClick={() => setPromoEnabled(!promoEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  promoEnabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  promoEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {promoEnabled && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Promo Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={promoInterval}
                    onChange={(e) => setPromoInterval(parseInt(e.target.value) || 60)}
                    min={30}
                    max={300}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Promo Message</label>
                  <textarea
                    value={promoMessage}
                    onChange={(e) => setPromoMessage(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleSaveSettings}
              className="w-full px-4 py-2 bg-neon-yellow hover:bg-neon-gold text-black font-medium rounded-lg transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// YOUTUBE STREAM STATUS COMPONENT
// ============================================

interface YouTubeStreamStatusProps {
  showId: string
}

export function YouTubeStreamStatus({ showId }: YouTubeStreamStatusProps) {
  const { status, isLive } = useYouTubeStreamStatus(showId)

  if (status === 'idle' || status === 'ended') {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {isLive ? (
        <>
          <Youtube className="w-4 h-4 text-red-500" />
          <span className="text-red-400 font-medium">YouTube Live</span>
        </>
      ) : (
        <>
          <Radio className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400">Stream connecting...</span>
        </>
      )}
    </div>
  )
}

// ============================================
// YOUTUBE BROADCAST BADGE
// ============================================

export function YouTubeBroadcastBadge({ showId }: { showId: string }) {
  const { show, loading } = useShowYouTubeBroadcast(showId)

  if (loading) {
    return null
  }

  if (!show?.youtube_broadcast_id) {
    return null
  }

  return (
    <a
      href={show.youtube_stream_url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition-colors"
    >
      <Youtube className="w-3 h-3" />
      Watch on YouTube
    </a>
  )
}

export default YouTubeBroadcastControl
