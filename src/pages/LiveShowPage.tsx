import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Users, Heart, Gift, Send, ThumbsUp, Star, MessageCircle, Share2, Mic, MicOff, Video, Play } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useShow, useCurrentPerformance, useVote } from '../hooks/useSupabaseData'
import { supabase } from '../lib/supabase'
import type { User, ChatMessage } from '../lib/supabase'

const gifts = [
  { id: '1', name: 'Rose', value: 1, emoji: '🌹' },
  { id: '2', name: 'Heart', value: 5, emoji: '❤️' },
  { id: '3', name: 'Star', value: 10, emoji: '⭐' },
  { id: '4', name: 'Diamond', value: 50, emoji: '💎' },
  { id: '5', name: 'Crown', value: 100, emoji: '👑' },
]

export function LiveShowPage() {
  const { id } = useParams<{ id: string }>()
  const { viewerCount, setViewerCount, chatMessages, addChatMessage, setHasVoted } = useAppStore()
  
  const [muted, setMuted] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedGift, setSelectedGift] = useState<typeof gifts[0] | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  
  const { show, loading: showLoading } = useShow(id || '')
  const { performance, loading: perfLoading } = useCurrentPerformance(id || '')
  const { vote, loading: voting, hasVoted } = useVote(performance?.id || '')
  
  const [performer, setPerformer] = useState<User | null>(null)

  useEffect(() => {
    if (show) {
      setViewerCount(show.viewer_count || 0)
    }
  }, [show, setViewerCount])

  useEffect(() => {
    if (performance?.user_id) {
      supabase
        .from('users')
        .select('*')
        .eq('id', performance.user_id)
        .single()
        .then(({ data }) => setPerformer(data))
    }
  }, [performance])

  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`show-chat-${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `show_id=eq.${id}`
      }, (payload) => {
        addChatMessage(payload.new as ChatMessage)
      })
      .subscribe()

    supabase
      .from('chat_messages')
      .select('*')
      .eq('show_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          data.reverse().forEach(msg => addChatMessage(msg))
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, addChatMessage])

  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(viewerCount + Math.floor(Math.random() * 10) - 5)
    }, 5000)
    return () => clearInterval(interval)
  }, [viewerCount, setViewerCount])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && id) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { error } = await supabase
          .from('chat_messages')
          .insert({
            user_id: user.id,
            show_id: id,
            message: message.trim(),
          })

        if (!error) {
          addChatMessage({
            id: Date.now().toString(),
            user_id: user.id,
            show_id: id,
            message: message.trim(),
            created_at: new Date().toISOString(),
          })
        }
      }
      setMessage('')
    }
  }

  const handleVote = async () => {
    if (!hasVoted && performance?.id) {
      await vote('vote')
      setHasVoted(true)
    }
  }

  if (showLoading || perfLoading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-candy-red border-t-transparent animate-spin" />
          <p className="text-gray-400">Loading show...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)]">
      {/* Main Stage */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{show?.title || 'Live Show'}</h1>
            {show?.status === 'live' && (
              <span className="live-badge pulse-live flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-neon-yellow">
              <Users className="w-5 h-5" />
              {viewerCount.toLocaleString()}
            </span>
            <button
              onClick={() => setMuted(!muted)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player - Agora Stream */}
        <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden neon-border-red bg-black">
          <div className="absolute inset-0 bg-gradient-to-br from-candy-red/20 to-neon-gold/20 flex items-center justify-center">
            <div className="text-center">
              <div className="w-64 h-48 mx-auto mb-4 rounded-xl overflow-hidden border-2 border-neon-gold neon-glow-gold">
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  {performer ? (
                    <img src={performer.avatar || `https://i.pravatar.cc/150?u=${performer.id}`} alt={performer.username} className="w-full h-full object-cover opacity-50" />
                  ) : (
                    <Video className="w-12 h-12 text-neon-gold" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-12 h-12 text-neon-gold" fill="currentColor" />
                  </div>
                </div>
              </div>
              <p className="text-gray-400">Live Performance Stream</p>
              <p className="text-sm text-neon-yellow">Powered by Agora</p>
            </div>
          </div>
        </div>

        {/* Performer Spotlight */}
        <div className="mt-4 glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full avatar-ring overflow-hidden">
                <img 
                  src={performer?.avatar || `https://i.pravatar.cc/150?u=${performance?.user_id || 'default'}`} 
                  alt={performer?.username || 'Performer'} 
                  className=" object-cover" 
                />
              w-full h-full</div>
              <div>
                <h3 className="font-bold text-neon-yellow text-lg">@{performer?.username || 'Loading...'}</h3>
                <p className="text-sm text-gray-400">{performer?.talent_category || 'Talent'}</p>
                <p className="text-sm text-candy-red flex items-center gap-1">
                  <Heart className="w-4 h-4" fill="currentColor" />
                  {performance?.votes || 0} votes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-neon-gold px-6 py-2 rounded-full">
                Follow
              </button>
              <button
                onClick={handleVote}
                disabled={hasVoted || voting || !performance}
                className={`vote-pulse btn-neon-red px-6 py-2 rounded-full flex items-center gap-2 ${hasVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ThumbsUp className="w-5 h-5" />
                {hasVoted ? 'Voted!' : voting ? 'Voting...' : 'Vote'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side Panel */}
      <div className="w-full lg:w-80 flex flex-col min-h-0">
        {/* Tabs */}
        <div className="flex mb-4 border-b border-white/10">
          <button className="flex-1 py-2 text-center text-neon-yellow border-b-2 border-neon-yellow">
            <MessageCircle className="w-4 h-4 inline mr-1" />
            Chat
          </button>
          <button className="flex-1 py-2 text-center text-gray-400 hover:text-white">
            <Gift className="w-4 h-4 inline mr-1" />
            Gifts
          </button>
        </div>

        {/* Chat Messages */}
        <div ref={chatRef} className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0">
          {chatMessages.map((msg) => (
            <div key={msg.id} className="chat-message glass rounded-lg p-2">
              <span className="font-bold text-neon-gold text-sm">User:</span>
              <span className="text-gray-300 text-sm ml-1">{msg.message}</span>
            </div>
          ))}
        </div>

        {/* Gift Selection */}
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">Send a Gift</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {gifts.map((gift) => (
              <button
                key={gift.id}
                onClick={() => setSelectedGift(gift)}
                className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                  selectedGift?.id === gift.id
                    ? 'bg-neon-gold/20 border border-neon-gold'
                    : 'glass hover:bg-white/10'
                }`}
              >
                <span className="text-2xl">{gift.emoji}</span>
                <p className="text-xs text-gray-400">{gift.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Send a message..."
            className="flex-1 h-10 px-4 rounded-full input-neon text-sm"
          />
          <button
            type="submit"
            className="w-10 h-10 rounded-full btn-neon-red flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Contestant Queue */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="font-bold text-neon-yellow mb-3 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Up Next
          </h4>
          <div className="text-center text-gray-400 py-4">
            <p>Queue loading...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
