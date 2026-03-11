import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Send, Gift, Smile, MessageCircle, Crown, Star, Mic, Clapperboard, MoreVertical, Phone, Video, UserPlus, UserMinus, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

interface Conversation {
  id: string
  userId: string
  username: string
  avatar: string
  role: 'ceo' | 'judge' | 'auditioner' | 'performer'
  lastMessage: string
  timestamp: string
  unread: number
  isOnline: boolean
  isFollowing: boolean
}

interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
  isOwn: boolean
}

const roleIcons: Record<string, React.ReactNode> = {
  ceo: <Crown className="w-3 h-3 text-neon-yellow" />,
  judge: <Star className="w-3 h-3 text-purple-400" />,
  auditioner: <Mic className="w-3 h-3 text-blue-400" />,
  performer: <Clapperboard className="w-3 h-3 text-green-400" />
}

const roleLabels: Record<string, string> = {
  ceo: 'CEO',
  judge: 'Judge',
  auditioner: 'Auditioner',
  performer: 'Performer'
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

const MESSAGE_COST = 500

export function MaiChatsPage() {
  const { user, coins, setUser } = useAppStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return
    
    try {
      // Get users we're following
      const { data: followingData } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = new Set((followingData || []).map(f => f.following_id))

      // Get recent private messages to find conversations
      const { data: messagesData } = await supabase
        .from('private_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(100)

      // Get unique user IDs from messages
      const userIds = new Set<string>()
      const latestMessages: Record<string, { message: string, timestamp: string }> = {}
      
      messagesData?.forEach((msg: { sender_id: string; receiver_id: string; message: string; created_at: string }) => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        userIds.add(otherUserId)
        
        if (!latestMessages[otherUserId] || new Date(msg.created_at) > new Date(latestMessages[otherUserId].timestamp)) {
          latestMessages[otherUserId] = {
            message: msg.message,
            timestamp: new Date(msg.created_at).toLocaleString()
          }
        }
      })

      // Get user profiles
      if (userIds.size > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, avatar, is_ceo, is_admin, is_performer')
          .in('id', Array.from(userIds))

        const userBadges = await Promise.all(
          (usersData || []).map(async (u: { id: string; username: string; avatar: string; is_ceo: boolean; is_admin: boolean; is_performer: boolean }) => {
            const { data: badges } = await supabase
              .from('user_badges')
              .select('badge_type')
              .eq('user_id', u.id)
              .in('badge_type', ['judge', 'auditioner', 'performer'])
            
            let role: 'ceo' | 'judge' | 'auditioner' | 'performer' = 'auditioner'
            if (u.is_ceo) role = 'ceo'
            else if (badges?.some((b: { badge_type: string }) => b.badge_type === 'judge')) role = 'judge'
            else if (badges?.some((b: { badge_type: string }) => b.badge_type === 'performer')) role = 'performer'
            else if (badges?.some((b: { badge_type: string }) => b.badge_type === 'auditioner')) role = 'auditioner'
            
            return { ...u, role }
          })
        )

        const convs: Conversation[] = userBadges.map((u: { id: string; username: string; avatar: string; role: 'ceo' | 'judge' | 'auditioner' | 'performer' }) => ({
          id: u.id,
          userId: u.id,
          username: u.username,
          avatar: u.avatar || '',
          role: u.role,
          lastMessage: latestMessages[u.id]?.message || 'No messages yet',
          timestamp: latestMessages[u.id]?.timestamp || '',
          unread: 0,
          isOnline: false,
          isFollowing: followingIds.has(u.id)
        }))

        setConversations(convs)
        if (convs.length > 0 && !selectedConversation) {
          setSelectedConversation(convs[0])
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err)
    } finally {
      setLoading(false)
    }
  }, [user, selectedConversation])

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async () => {
    if (!user || !selectedConversation) return

    try {
      const { data } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedConversation.userId}),and(sender_id.eq.${selectedConversation.userId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      const msgs: Message[] = (data || []).map((msg: { id: string; sender_id: string; message: string; created_at: string }) => ({
        id: msg.id,
        senderId: msg.sender_id,
        content: msg.message,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: msg.sender_id === user.id
      }))

      setMessages(msgs)
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }, [user, selectedConversation])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initial fetch
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Fetch messages when conversation changes
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Check if following
  const checkFollowing = async (otherUserId: string): Promise<boolean> => {
    if (!user) return false
    
    const { data } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', otherUserId)
      .single()

    return !!data
  }

  // Handle follow/unfollow
  const handleToggleFollow = async () => {
    if (!user || !selectedConversation) return

    const isFollowing = await checkFollowing(selectedConversation.userId)

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', selectedConversation.userId)
      } else {
        // Follow
        await supabase
          .from('followers')
          .insert({
            follower_id: user.id,
            following_id: selectedConversation.userId
          })
      }

      // Update local state
      setSelectedConversation({
        ...selectedConversation,
        isFollowing: !isFollowing
      })

      // Refresh conversations
      fetchConversations()
    } catch (err) {
      console.error('Error toggling follow:', err)
    }
  }

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !user || !selectedConversation) return

    // Check if performer and not following
    const isPerformer = selectedConversation.role === 'performer' || selectedConversation.role === 'judge' || selectedConversation.role === 'ceo'
    const isFollowing = await checkFollowing(selectedConversation.userId)

    if (isPerformer && !isFollowing) {
      // Need to pay 500 coins
      if (coins < MESSAGE_COST) {
        setShowPayModal(true)
        return
      }

      // Show confirmation
      const confirmed = window.confirm(`This performer requires ${MESSAGE_COST} coins to message. Would you like to pay?`)
      if (!confirmed) return

      // Deduct coins from sender and add to receiver
      const { data: senderData } = await supabase
        .from('users')
        .select('coin_balance')
        .eq('id', user.id)
        .single()

      if (senderData && senderData.coin_balance >= MESSAGE_COST) {
        // Deduct from sender
        await supabase
          .from('users')
          .update({ coin_balance: senderData.coin_balance - MESSAGE_COST })
          .eq('id', user.id)

        // Add to receiver (performer)
        const { data: receiverData } = await supabase
          .from('users')
          .select('coin_balance')
          .eq('id', selectedConversation.userId)
          .single()

        if (receiverData) {
          await supabase
            .from('users')
            .update({ coin_balance: receiverData.coin_balance + MESSAGE_COST })
            .eq('id', selectedConversation.userId)
        }

        // Update local store
        setUser({ ...user, coin_balance: senderData.coin_balance - MESSAGE_COST })
      } else {
        setShowPayModal(true)
        return
      }
    }

    setSending(true)
    try {
      const { data, error } = await supabase
        .from('private_messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedConversation.userId,
          message: messageInput,
          is_paid_message: isPerformer && !isFollowing
        })
        .select()
        .single()

      if (error) throw error

      // Add to local messages
      setMessages([...messages, {
        id: data.id,
        senderId: user.id,
        content: messageInput,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: true
      }])

      setMessageInput('')
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex gap-4 p-4">
      {/* Left Panel - Conversations List */}
      <div className="w-80 flex-shrink-0 glass-dark rounded-xl neon-border-red flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-6 h-6 text-neon-yellow" />
            <h1 className="text-xl font-bold shimmer-gold">Mai Chats</h1>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg input-neon text-sm"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-400">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400">No conversations yet</div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-3 flex items-start gap-3 hover:bg-white/5 transition-all border-b border-white/5 ${selectedConversation?.id === conv.id ? 'bg-candy-red/10 neon-border-gold' : ''}`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full avatar-ring flex items-center justify-center bg-gradient-to-br from-candy-red to-purple-600">
                    {conv.avatar ? (
                      <img src={conv.avatar} alt={conv.username} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-white font-bold">{getInitials(conv.username)}</span>
                    )}
                  </div>
                  {conv.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-dark"></span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold ${selectedConversation?.id === conv.id ? 'text-neon-yellow' : 'text-white'}`}>
                      {conv.username}
                    </span>
                    <span className="flex items-center gap-1">{roleIcons[conv.role]}</span>
                    {conv.unread > 0 && (
                      <span className="ml-auto bg-candy-red text-white text-xs px-2 py-0.5 rounded-full">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate">{conv.lastMessage}</p>
                  <span className="text-xs text-gray-500">{conv.timestamp}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Chat Window */}
      <div className="flex-1 glass-dark rounded-xl neon-border-red flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full avatar-ring flex items-center justify-center bg-gradient-to-br from-candy-red to-purple-600">
                    {selectedConversation.avatar ? (
                      <img src={selectedConversation.avatar} alt={selectedConversation.username} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-white font-bold">{getInitials(selectedConversation.username)}</span>
                    )}
                  </div>
                  {selectedConversation.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-dark"></span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{selectedConversation.username}</h2>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      {roleIcons[selectedConversation.role]}
                      <span>{roleLabels[selectedConversation.role]}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Follow/Unfollow Button */}
                {user && user.id !== selectedConversation.userId && (
                  <button
                    onClick={handleToggleFollow}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm transition-colors ${
                      selectedConversation.isFollowing
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-neon-yellow/20 hover:bg-neon-yellow/30 text-neon-yellow'
                    }`}
                  >
                    {selectedConversation.isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4" />
                        <span>Unfollow</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}

                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Phone className="w-5 h-5 text-gray-400" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Video className="w-5 h-5 text-gray-400" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-gray-800">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] ${
                        msg.isOwn
                          ? 'bg-neon-yellow/20 text-white rounded-2xl rounded-br-md neon-border-glow'
                          : 'bg-dark text-white rounded-2xl rounded-bl-md neon-border-red'
                      } px-4 py-2`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <span className={`text-xs text-gray-500 ${msg.isOwn ? 'text-right block' : ''}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Payment Required Notice */}
            {user && selectedConversation.userId !== user.id && (selectedConversation.role === 'performer' || selectedConversation.role === 'judge' || selectedConversation.role === 'ceo') && !selectedConversation.isFollowing && (
              <div className="px-4 py-2 bg-candy-red/20 border-t border-candy-red/30 flex items-center gap-2 text-sm text-candy-red">
                <Lock className="w-4 h-4" />
                <span>Following required to message. Cost: {MESSAGE_COST} coins</span>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Smile className="w-5 h-5 text-neon-yellow" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Gift className="w-5 h-5 text-candy-red" />
                </button>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                    disabled={sending}
                    className="w-full h-10 px-4 rounded-full input-neon"
                  />
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={sending || !messageInput.trim()}
                  className="btn-neon-gold p-3 rounded-full hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-400 mb-2">Select a conversation</h2>
              <p className="text-gray-500">Choose a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Insufficient Coins Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-gray-900 border border-candy-red rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-candy-red" />
              Insufficient Coins
            </h3>
            <p className="text-gray-400 mb-4">
              You need {MESSAGE_COST} coins to message this performer. Would you like to purchase more coins?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPayModal(false)
                }}
                className="flex-1 py-2 bg-neon-yellow text-black font-bold rounded-lg"
              >
                Buy Coins
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
