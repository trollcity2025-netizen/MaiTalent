import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { 
  Users, Gift, Send, MessageCircle, AlertTriangle, Crown, Gavel,
  Clock, SkipForward, Play, Mic, MicOff, Sparkles, Star, Video, AlertCircle as AlertIcon
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { useUserRole } from '../hooks/useUserRole'
import { useAgora } from '../hooks/useAgora'
import { VideoControls } from '../components/VideoControls'
import { AgoraVideo } from '../components/AgoraVideo'

// IP Ban check function
async function checkIPBan(ipAddress: string): Promise<{ banned: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase
      .from('banned_ips')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking IP ban:', error);
      return { banned: false };
    }

    if (data) {
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { banned: false };
      }
      return { banned: true, reason: data.reason };
    }

    return { banned: false };
  } catch (err) {
    console.error('IP ban check error:', err);
    return { banned: false };
  }
}

interface PerformerBox {
  id: string
  userId: string
  username: string
  avatar: string
  isPerforming: boolean
  score: number
  gifts: number
  judgeVotes: number // YES votes from judges
  viewerCount?: number
  isPublishing?: boolean // Track if performer is publishing their track
}

interface JudgeBox {
  id: number
  userId: string | null
  username: string | null
  avatar: string | null
  isConnected: boolean
  isJoined: boolean
  role?: string
  vote?: 'yes' | 'no' | null // Judge's vote for current performer
  votedForPerformer?: number // Track which performer the judge voted for
}

interface QueueItem {
  id: string
  userId: string
  username: string
  avatar: string
  position: number
  status: string
  isConnected: boolean
}

interface GiftOption {
  emoji: string
  name: string
  price: number
}

interface FloatingParticle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

const PERFORMANCE_DURATION = 120 // 2 minutes

const giftOptions: GiftOption[] = [
  { emoji: '🌹', name: 'Rose', price: 20 },
  { emoji: '❤️', name: 'Heart', price: 50 },
  { emoji: '⭐', name: 'Star', price: 100 },
  { emoji: '💎', name: 'Diamond', price: 250 },
  { emoji: '👑', name: 'Crown', price: 500 },
  { emoji: '🚀', name: 'Rocket', price: 1000 },
]

export function LiveShowPage() {
  const { id } = useParams<{ id: string }>()
  const { user, viewerCount, chatMessages, addChatMessage, removeChatMessage, logout } = useAppStore()
  const { isAdmin, isCeo } = useUserRole()
  
  // IP Ban state
  const [isBanned, setIsBanned] = useState(false)
  const [banReason, setBanReason] = useState('')
  
  // Check IP ban on page load
  useEffect(() => {
    const checkBan = async () => {
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipResponse.json()
        const banResult = await checkIPBan(ipData.ip)
        
        if (banResult.banned) {
          setIsBanned(true)
          setBanReason(banResult.reason || 'Your IP address has been banned from this platform.')
          // Optionally log out the user
          await supabase.auth.signOut()
          logout()
        }
      } catch (err) {
        console.warn('Could not check IP ban:', err)
      }
    }

    checkBan()
  }, [logout])
  
  // Floating particles for stage effect
  const [particles, setParticles] = useState<FloatingParticle[]>([])
  
  // Confetti particles - generated when showWinner changes
  const [confettiParticles, setConfettiParticles] = useState<Array<{id: number; left: number; delay: number; duration: number; size: number; color: string; isCircle: boolean}>>([])
  
  // Animated gift traveling across stage
  const [travelingGift, setTravelingGift] = useState<{emoji: string, target: string} | null>(null)
  
  // Stage state
  const [hostBox, setHostBox] = useState({
    userId: 'host-1',
    username: 'Host',
    avatar: 'https://i.pravatar.cc/150?u=hostmain',
    isConnected: true,
    position: 'side' as 'side' | 'center',
    isSpeaking: false
  })
  
  // 4 Judge boxes - initially empty, users can join them
  const [judgeBoxes, setJudgeBoxes] = useState<JudgeBox[]>(() => {
    // Empty judge boxes - real users will join them
    return [
      { id: 1, userId: null, username: null, avatar: null, isConnected: false, isJoined: false, role: 'Judge' },
      { id: 2, userId: null, username: null, avatar: null, isConnected: false, isJoined: false, role: 'Judge' },
      { id: 3, userId: null, username: null, avatar: null, isConnected: false, isJoined: false, role: 'Judge' },
      { id: 4, userId: null, username: null, avatar: null, isConnected: false, isJoined: false, role: 'Judge' },
    ]
  })

  // CEO Box - separate golden box only CEO can join
  const [ceoBox, setCeoBox] = useState<{
    isJoined: boolean
    userId: string | null
    username: string | null
    avatar: string | null
  }>({
    isJoined: false,
    userId: null,
    username: null,
    avatar: null
  })
  
  // Track if CEO is currently publishing video
  const [isCeoPublishing, setIsCeoPublishing] = useState(false)
  
  // Track if host is currently publishing (controlled by checkbox)
  const [hostPublishEnabled, setHostPublishEnabled] = useState(false)
  
  // Track performer publishing state (for each performer box)
  const [performerPublishEnabled, setPerformerPublishEnabled] = useState<[boolean, boolean]>([false, false])
  
  // Winner state
  const [winner, setWinner] = useState<'performer1' | 'performer2' | 'draw' | null>(null)
  const [showWinner, setShowWinner] = useState(false)
  
  const [performerBoxes, setPerformerBoxes] = useState<PerformerBox[]>(() => {
    // Empty performer boxes - will be populated when host starts show
    return [
      { id: 'perf-1', userId: '', username: '', avatar: '', isPerforming: false, score: 0, gifts: 0, judgeVotes: 0, viewerCount: 0, isPublishing: false },
      { id: 'perf-2', userId: '', username: '', avatar: '', isPerforming: false, score: 0, gifts: 0, judgeVotes: 0, viewerCount: 0, isPublishing: false },
    ]
  })
  
  // Get the performers to display (always use performerBoxes - no preview mode)
  const displayPerformers = performerBoxes
  
  // Queue state - starts empty, loaded from database
  const [queue, setQueue] = useState<QueueItem[]>([])
  
  // Show state: 'pre-show' | 'live' | 'post-show'
  const [showState, setShowState] = useState<'pre-show' | 'live' | 'post-show'>('pre-show')
  
  // Pre-show countdown timer (daily show at 5pm MST)
  const [preShowCountdown, setPreShowCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [showStartTime, setShowStartTime] = useState<Date | null>(null)
  
  // Store usernames for chat messages
  const [chatUsernames, setChatUsernames] = useState<Record<string, string>>({})
  
  // Calculate show start time (5pm MST daily)
  useEffect(() => {
    const calculateShowTime = () => {
      const now = new Date()
      const showTime = new Date(now)
      showTime.setHours(17, 0, 0, 0) // 5pm
      
      // If it's already past 5pm today, get tomorrow's show
      if (now.getHours() >= 17 || (now.getHours() === 16 && now.getMinutes() >= 59)) {
        showTime.setDate(showTime.getDate() + 1)
      }
      
      setShowStartTime(showTime)
    }
    
    calculateShowTime()
  }, [])
  
  // Pre-show countdown timer
  useEffect(() => {
    if (!showStartTime) return
    
    const updateCountdown = () => {
      const now = new Date()
      const diff = showStartTime.getTime() - now.getTime()
      
      if (diff > 0) {
        setPreShowCountdown({
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        })
      }
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [showStartTime])
  
  // Timer state
  const [timer, setTimer] = useState(PERFORMANCE_DURATION)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isSuddenDeath, setIsSuddenDeath] = useState(false)
  const [suddenDeathTimer, setSuddenDeathTimer] = useState(10)
  
  // Video streaming state - track who is publishing
  const [isPublishingVideo, setIsPublishingVideo] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<'host' | 'judge' | 'performer' | 'ceo' | null>(null)
  
  // Queue state - track if user is in queue
  const [isInQueue, setIsInQueue] = useState(false)
  
  // Judge panel state - for open/close voting panel
  const [isJudgePanelOpen, setIsJudgePanelOpen] = useState(false)
  
  // Agora channel name
  const agoraChannelName = id ? `show-${id}` : 'show-preview'
  
  // Chat and message state
  const [selectedGift, setSelectedGift] = useState<GiftOption | null>(null)
  const [giftRecipient, setGiftRecipient] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isHost, setIsHost] = useState(() => true)
  const [curtainsOpen, setCurtainsOpen] = useState(false)
  
  const chatRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Agora hook - only initialize when user is actively publishing
  const agora = useAgora({
    channelName: agoraChannelName,
    role: currentUserRole || 'host',
    userId: user?.id || 'anonymous'
  })

  // Generate floating particles
  useEffect(() => {
    const generateParticles = () => {
      const newParticles: FloatingParticle[] = []
      for (let i = 0; i < 30; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 3 + 1,
          duration: Math.random() * 10 + 10,
          delay: Math.random() * 5
        })
      }
      setParticles(newParticles)
    }
    generateParticles()
  }, [])

  // Handle host speaking toggle
  const handleHostSpeak = () => {
    setHostBox(prev => ({
      ...prev,
      isSpeaking: !prev.isSpeaking,
      position: !prev.isSpeaking ? 'center' : 'side'
    }))
    // Open curtains when host starts speaking, close when done
    if (!hostBox.isSpeaking) {
      setCurtainsOpen(true)
    }
  }

  // Handle host publishing toggle (checkbox)
  const handleHostPublishToggle = async (checked: boolean) => {
    if (checked && user) {
      setCurrentUserRole('host')
      setHostPublishEnabled(true)
      setIsPublishingVideo(true)
      await agora.join()
    } else {
      await agora.leave()
      setHostPublishEnabled(false)
      setIsPublishingVideo(false)
      setCurrentUserRole(null)
      setIsMuted(false)
      setIsVideoOff(false)
    }
  }

  // Handle performer publishing toggle (for each performer box)
  const handlePerformerPublishToggle = async (performerIndex: 0 | 1, checked: boolean) => {
    if (checked && user && performerBoxes[performerIndex].userId === user.id) {
      setCurrentUserRole('performer')
      setPerformerPublishEnabled(prev => {
        const newState = [...prev] as [boolean, boolean]
        newState[performerIndex] = true
        return newState
      })
      setIsPublishingVideo(true)
      await agora.join()
    } else if (!checked) {
      await agora.leave()
      setPerformerPublishEnabled(prev => {
        const newState = [...prev] as [boolean, boolean]
        newState[performerIndex] = false
        return newState
      })
      setIsPublishingVideo(false)
      setCurrentUserRole(null)
      setIsMuted(false)
      setIsVideoOff(false)
    }
  }

  // Handle curtains toggle
  const handleToggleCurtains = () => {
    setCurtainsOpen(!curtainsOpen)
  }

  // Start the show - transitions from pre-show to live and inserts queue users as performers
  const startShow = async () => {
    // Fetch queue users and insert them as performers
    if (id && queue.length > 0) {
      try {
        // Get first two users from queue
        const nextTwo = queue.slice(0, 2)
        
        // Fetch user details for the queue users
        const userIds = nextTwo.map(q => q.userId).filter(Boolean)
        let userData: Array<{id: string; username: string; avatar: string}> = []
        
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, username, avatar')
            .in('id', userIds)
          
          if (users) userData = users
        }
        
        // Update performer boxes with queue users
        const updatedPerformers = nextTwo.map((q, idx) => {
          const user = userData.find(u => u.id === q.userId)
          return {
            ...performerBoxes[idx],
            userId: q.userId || `user-${idx}`,
            username: user?.username || q.username || `Performer ${idx + 1}`,
            avatar: user?.avatar || q.avatar || '',
            isPerforming: true,
            score: 0,
            gifts: 0,
            judgeVotes: 0,
            viewerCount: 0,
            isPublishing: false
          }
        })
        
        // If we have less than 2 queue users, fill remaining with empty
        while (updatedPerformers.length < 2) {
          updatedPerformers.push({
            ...performerBoxes[updatedPerformers.length],
            userId: '',
            username: '',
            avatar: '',
            isPerforming: false,
            score: 0,
            gifts: 0,
            judgeVotes: 0,
            viewerCount: 0,
            isPublishing: false
          })
        }
        
        setPerformerBoxes(updatedPerformers)
        
        // Update queue - remove the first two
        setQueue(queue.slice(2))
      } catch (err) {
        console.error('Error inserting queue users:', err)
      }
    }
    
    setShowState('live')
    setCurtainsOpen(true)
    setTimer(PERFORMANCE_DURATION)
    setIsTimerRunning(true)
  }

  // End show and reset to pre-show
  const endShow = () => {
    setShowState('pre-show')
    setCurtainsOpen(false)
    setShowWinner(false)
    setWinner(null)
    // Reset performer boxes
    setPerformerBoxes(prev => prev.map(p => ({ ...p, gifts: 0, judgeVotes: 0, isPerforming: false, isPublishing: false })))
    // Reset judge votes
    setJudgeBoxes(prev => prev.map(j => ({ ...j, vote: null, votedForPerformer: undefined })))
    // Reset publishing states
    setHostPublishEnabled(false)
    setPerformerPublishEnabled([false, false])
  }

  // Handle spacebar to toggle curtains for host/CEO
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (isHost || isCeo) && !e.target?.toString().includes('Input')) {
        e.preventDefault()
        handleToggleCurtains()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isHost, isCeo, handleToggleCurtains])

  // Judge seat handler
  const handleJoinAsHost = async () => {
    if (!user) {
      alert('Please log in first!')
      return
    }
    setCurrentUserRole('host')
    setIsPublishingVideo(true)
    await agora.join()
  }

  // Handle joining as judge
  const handleJoinAsJudge = async (seatId: number) => {
    if (!user) {
      alert('Please log in first!')
      return
    }
    
    setJudgeBoxes(prev => prev.map(judge => 
      judge.id === seatId 
        ? { ...judge, isJoined: true, userId: user.id, username: user.username, avatar: user.avatar || '' }
        : judge
    ))
    
    setCurrentUserRole('judge')
    setIsPublishingVideo(true)
    await agora.join()
  }

  // Handle judge seat click (for empty seats)
  const handleJoinJudgeSeat = (seatId: number) => {
    handleJoinAsJudge(seatId)
  }

  // Handle joining as CEO
  const handleJoinAsCeo = async () => {
    if (!user) {
      alert('Please log in first!')
      return
    }
    
    if (!isCeo) {
      alert('Only the CEO can join this seat!')
      return
    }
    
    // Set CEO box state
    setCeoBox({
      isJoined: true,
      userId: user.id,
      username: user.username,
      avatar: user.avatar || ''
    })
    
    // CEO has their own role - don't use 'judge' role
    setCurrentUserRole('ceo')
    setIsCeoPublishing(true)
    setIsPublishingVideo(true)
    await agora.join()
  }

  // Handle leaving CEO seat
  const handleLeaveCeoSeat = async () => {
    await agora.leave()
    setIsPublishingVideo(false)
    setIsCeoPublishing(false)
    setCurrentUserRole(null)
    setCeoBox({
      isJoined: false,
      userId: null,
      username: null,
      avatar: null
    })
  }

  // Handle leaving the stage (for host, judge, or performer)
  const handleLeave = async () => {
    // Check if user is a judge
    if (currentUserRole === 'judge' && user) {
      await agora.leave()
      setIsPublishingVideo(false)
      setCurrentUserRole(null)
      setIsMuted(false)
      setIsVideoOff(false)
      
      // Clear the judge's box
      setJudgeBoxes(prev => prev.map(judge => 
        judge.userId === user.id 
          ? { ...judge, isJoined: false, userId: null, username: null, avatar: null, vote: null }
          : judge
      ))
    } else {
      await agora.leave()
      setIsPublishingVideo(false)
      setCurrentUserRole(null)
      setIsMuted(false)
      setIsVideoOff(false)
    }
  }

  // Handle joining the queue (for regular users to perform)
  const handleJoinQueue = async () => {
    if (!user) {
      alert('Please log in first!')
      return
    }
    
    // Check queue limit (max 52)
    if (queue.length >= 52) {
      alert('Queue is full! Maximum 52 performers allowed.')
      return
    }
    
    try {
      // Add user to queue in database
      const { error } = await supabase
        .from('show_queue')
        .insert({
          show_id: id,
          user_id: user.id,
          position: queue.length + 1,
          status: 'waiting'
        })
      
      if (error) throw error
      
      setIsInQueue(true)
      alert('You have joined the queue! Wait for your turn to perform.')
    } catch (err) {
      console.error('Error joining queue:', err)
      alert('Failed to join queue. Please try again.')
    }
  }

  // Handle leaving the queue
  const handleLeaveQueue = async () => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('show_queue')
        .delete()
        .eq('show_id', id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setIsInQueue(false)
    } catch (err) {
      console.error('Error leaving queue:', err)
    }
  }

  // Handle toggle mute
  const handleToggleMute = () => {
    if (isMuted) {
      agora.unmuteAudio()
    } else {
      agora.muteAudio()
    }
    setIsMuted(!isMuted)
  }

  // Handle toggle video
  const handleToggleVideo = () => {
    if (isVideoOff) {
      agora.unmuteVideo()
    } else {
      agora.muteVideo()
    }
    setIsVideoOff(!isVideoOff)
  }

  const handleNextPerformer = () => {
    if (queue.length > 0) {
      const nextTwo = queue.slice(0, 2)
      setPerformerBoxes([
        { ...performerBoxes[0], userId: nextTwo[0]?.userId || '', username: nextTwo[0]?.username || '', avatar: nextTwo[0]?.avatar || '', isPerforming: true, score: 0, gifts: 0, judgeVotes: 0, isPublishing: false },
        { ...performerBoxes[1], userId: nextTwo[1]?.userId || '', username: nextTwo[1]?.username || '', avatar: nextTwo[1]?.avatar || '', isPerforming: true, score: 0, gifts: 0, judgeVotes: 0, isPublishing: false },
      ])
      setQueue(queue.slice(2))
      setTimer(PERFORMANCE_DURATION)
      setIsTimerRunning(true)
    } else {
      setPerformerBoxes([
        { ...performerBoxes[0], userId: '', username: '', avatar: '', isPerforming: false, score: 0, gifts: 0, judgeVotes: 0, isPublishing: false },
        { ...performerBoxes[1], userId: '', username: '', avatar: '', isPerforming: false, score: 0, gifts: 0, judgeVotes: 0, isPublishing: false },
      ])
      setIsTimerRunning(false)
    }
  }

  // Load show data
  useEffect(() => {
    if (!id) return

    // Only load from database when we have a show ID

    const loadQueue = async () => {
      const { data } = await supabase
        .from('show_queue')
        .select('*')
        .eq('show_id', id)
        .order('position', { ascending: true })
      
      if (data) {
        // Also fetch user details
        const userIds = data.map(item => item.user_id).filter(Boolean)
        let userData: Array<{id: string; username: string; avatar: string}> = []
        
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, username, avatar')
            .in('id', userIds)
          
          if (users) userData = users
        }
        
        setQueue(data.map((item, idx) => {
          const user = userData.find(u => u.id === item.user_id)
          return {
            id: item.id,
            userId: item.user_id,
            username: user?.username || `Performer ${idx + 1}`,
            avatar: user?.avatar || '',
            position: item.position,
            status: item.status,
            isConnected: false
          }
        }))
      }
    }
    loadQueue()

    const channel = supabase
      .channel('queue_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'show_queue',
        filter: `show_id=eq.${id}`
      }, () => loadQueue())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Timer logic
  useEffect(() => {
    if (isTimerRunning && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer(t => t - 1)
      }, 1000)
    } else if (timer === 0 && isTimerRunning) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => {
        setIsTimerRunning(false)
        // Determine winner before moving to next performer
        // Calculate winner based on points (gifts) + judge votes
        const perf1 = performerBoxes[0]
        const perf2 = performerBoxes[1]
        const score1 = perf1.gifts + (perf1.judgeVotes * 100)
        const score2 = perf2.gifts + (perf2.judgeVotes * 100)
        
        if (score1 > score2) {
          setWinner('performer1')
        } else if (score2 > score1) {
          setWinner('performer2')
        } else {
          setWinner('draw')
        }
        setShowWinner(true)
        setShowState('post-show')
      })
      return () => cancelAnimationFrame(timeoutId)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isTimerRunning, timer])

  // Sudden death timer
  useEffect(() => {
    if (isSuddenDeath && suddenDeathTimer > 0) {
      const ref = setInterval(() => {
        setSuddenDeathTimer(t => t - 1)
      }, 1000)
      return () => clearInterval(ref)
    } else if (isSuddenDeath && suddenDeathTimer === 0) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => {
        setIsSuddenDeath(false)
        setSuddenDeathTimer(10)
      })
      return () => cancelAnimationFrame(timeoutId)
    }
  }, [isSuddenDeath, suddenDeathTimer])

  // Chat and Gift subscriptions
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`show-updates-${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `show_id=eq.${id}`
      }, (payload) => {
        addChatMessage(payload.new as { id: string; user_id: string; show_id: string; message: string; created_at: string })
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'performance_gifts',
        filter: `show_id=eq.${id}`
      }, (payload) => {
        // Update gift counts when a gift is received
        const newGift = payload.new as { recipient_id: string; gift_price: number }
        setPerformerBoxes(prev => prev.map(box => 
          box.userId === newGift.recipient_id 
            ? { ...box, gifts: box.gifts + newGift.gift_price }
            : box
        ))
      })
      .subscribe()

    // Load chat messages
    supabase
      .from('chat_messages')
      .select('*')
      .eq('show_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          data.reverse().forEach(msg => addChatMessage(msg))
          
          // Fetch usernames for chat messages
          const userIds = [...new Set(data.map(msg => msg.user_id))]
          if (userIds.length > 0) {
            supabase
              .from('users')
              .select('id, username')
              .in('id', userIds)
              .then(({ data: users }) => {
                if (users) {
                  const usernameMap: Record<string, string> = {}
                  users.forEach(u => {
                    usernameMap[u.id] = u.username
                  })
                  setChatUsernames(usernameMap)
                }
              })
          }
        }
      })

    // Load existing gift counts for performers
    const loadGiftCounts = async () => {
      const { data: gifts } = await supabase
        .from('performance_gifts')
        .select('recipient_id, gift_price')
        .eq('show_id', id)
      
      if (gifts && gifts.length > 0) {
        // Aggregate gift counts by recipient
        const giftTotals: Record<string, number> = {}
        gifts.forEach(gift => {
          giftTotals[gift.recipient_id] = (giftTotals[gift.recipient_id] || 0) + gift.gift_price
        })
        
        setPerformerBoxes(prev => prev.map(box => 
          giftTotals[box.userId] !== undefined
            ? { ...box, gifts: giftTotals[box.userId] }
            : box
        ))
      }
    }
    loadGiftCounts()

    return () => { supabase.removeChannel(channel) }
  }, [id, addChatMessage])

  // Check user roles
  useEffect(() => {
    if (user) {
      requestAnimationFrame(() => setIsHost(Boolean(user?.is_ceo) || Boolean(user?.is_admin)))
    }
  }, [user])

  // Generate confetti when winner is shown
  useEffect(() => {
    if (showWinner) {
      // Use requestAnimationFrame to avoid calling setState synchronously in effect
      const timeoutId = requestAnimationFrame(() => {
        const particles = Array.from({ length: 50 }).map((_, i) => ({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 2,
          duration: Math.random() * 2 + 2,
          size: Math.random() * 10 + 5,
          color: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6', '#f39c12'][Math.floor(Math.random() * 6)],
          isCircle: Math.random() > 0.5
        }))
        setConfettiParticles(particles)
      })
      return () => cancelAnimationFrame(timeoutId)
    }
  }, [showWinner])

  const handleStartPerformance = () => {
    if (queue.length > 0) {
      const nextTwo = queue.slice(0, 2)
      setPerformerBoxes([
        { ...performerBoxes[0], userId: nextTwo[0]?.userId || '', username: nextTwo[0]?.username || '', avatar: nextTwo[0]?.avatar || '', isPerforming: true, score: 0, gifts: 0, judgeVotes: 0, isPublishing: false },
        { ...performerBoxes[1], userId: nextTwo[1]?.userId || '', username: nextTwo[1]?.username || '', avatar: nextTwo[1]?.avatar || '', isPerforming: true, score: 0, gifts: 0, judgeVotes: 0, isPublishing: false },
      ])
      setQueue(queue.slice(2))
      setTimer(PERFORMANCE_DURATION)
      setIsTimerRunning(true)
    }
  }

  const handleSuddenDeath = () => {
    setIsSuddenDeath(true)
    setSuddenDeathTimer(10)
    setIsTimerRunning(false)
  }

  // Handle judge voting (YES/NO) with restriction - cannot vote same way on multiple performers
  const handleJudgeVote = async (performerIndex: 0 | 1, vote: 'yes' | 'no') => {
    if (!user) {
      alert('Please log in to vote!')
      return
    }
    
    // Find which judge is the current user
    const judgeIndex = judgeBoxes.findIndex(j => j.isJoined && j.userId === user.id)
    if (judgeIndex === -1) {
      alert('You must be a judge to vote!')
      return
    }
    
    const currentJudge = judgeBoxes[judgeIndex]
    
    // Check if judge has already voted on another performer
    if (currentJudge.votedForPerformer !== undefined && currentJudge.votedForPerformer !== null) {
      // Judge has already voted - check if trying to vote same way
      if (currentJudge.vote === vote) {
        alert(`You already voted ${vote.toUpperCase()} for the other performer! You can only vote differently on each performer.`)
        return
      }
    }
    
    // Update judge's vote and which performer they voted for
    setJudgeBoxes(prev => prev.map((judge, idx) => 
      idx === judgeIndex ? { ...judge, vote: vote, votedForPerformer: performerIndex } : judge
    ))
    
    // If voting YES, increment the performer's judge votes
    if (vote === 'yes') {
      setPerformerBoxes(prev => prev.map((perf, idx) => 
        idx === performerIndex ? { ...perf, judgeVotes: perf.judgeVotes + 1 } : perf
      ))
    }
    
    console.log(`Judge voted ${vote} for performer ${performerIndex + 1}`)
  }
  
  const handleVote = (performerId: string) => {
    console.log('Voted for:', performerId)
  }

  const handleSendGift = async (performerId: string) => {
    if (!selectedGift) return
    
    // Check if user is logged in
    if (!user) {
      alert('Please log in to send gifts!')
      return
    }
    
    // Check if performer is valid
    if (!performerId) {
      alert('No performer selected!')
      return
    }
    
    try {
      // Insert gift into database
      const { error } = await supabase
        .from('performance_gifts')
        .insert({
          show_id: id,
          performance_id: id, // Use show_id as performance_id for now
          sender_id: user.id,
          recipient_id: performerId,
          gift_name: selectedGift.name,
          gift_emoji: selectedGift.emoji,
          gift_price: selectedGift.price
        })

      if (error) {
        console.error('Error sending gift:', error)
        alert('Failed to send gift. Please try again.')
        return
      }
      
      // Success - trigger traveling gift animation
      console.log('Sent gift to:', performerId, 'gift:', selectedGift.name, 'price:', selectedGift.price)
      setTravelingGift({ emoji: selectedGift.emoji, target: performerId })
      setTimeout(() => setTravelingGift(null), 2000)
      
      // Update local gift count for immediate feedback
      setPerformerBoxes(prev => prev.map(box => 
        box.userId === performerId 
          ? { ...box, gifts: box.gifts + selectedGift.price }
          : box
      ))
      
      // Clear selected gift
      setSelectedGift(null)
      
    } catch (err) {
      console.error('Error sending gift:', err)
      alert('Failed to send gift. Please try again.')
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && id && user) {
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
      setMessage('')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Show banned message if IP is banned
  if (isBanned) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertIcon className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-400 max-w-md">{banReason}</p>
          <p className="text-gray-500 text-sm mt-4">Please contact support if you believe this is an error.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-black">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 glass-dark relative z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white text-glow-gold">Live Show</h1>
          {/* Show Status Badge */}
          {showState === 'pre-show' ? (
            <span className="bg-neon-purple text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              WAITING
            </span>
          ) : (
            <span className="live-badge pulse-live flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 bg-white rounded-full"></span>
              LIVE
            </span>
          )}
          {isSuddenDeath && (
            <span className="bg-candy-red text-white px-4 py-1.5 rounded-full text-sm font-bold animate-pulse neon-glow-red">
              ⚡ SUDDEN DEATH!
            </span>
          )}
        </div>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-neon-yellow text-lg">
            <Users className="w-5 h-5" />
            <span className="font-bold">{viewerCount.toLocaleString()}</span>
            <span className="text-xs text-gray-400">viewers</span>
          </span>
          {isHost && (
            <button
              onClick={handleSuddenDeath}
              className="btn-neon-red px-4 py-2 rounded-full text-sm flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Sudden Death
            </button>
          )}
        </div>
      </div>

      {/* Main Stage Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ==================== THEATER STAGE BACKGROUND ==================== */}
        <div className="absolute inset-0 min-h-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0505] to-[#1a0808]"></div>
          
          {/* Warm stage lighting gradient (orange, gold, red) */}
          <div className="absolute inset-0 bg-gradient-to-b from-orange-900/20 via-red-900/10 to-black"></div>
          
          {/* Theater Curtains - Left - disappears when opened */}
          <div className={`absolute top-0 left-0 h-full transition-all duration-1000 overflow-hidden ${curtainsOpen ? 'w-0 opacity-0 z-0' : 'w-1/2 z-10'}`}>
            <div className={`h-full curtain-left transition-all duration-1000 ${curtainsOpen ? 'w-0' : 'w-full'}`}>
              {/* Curtain rod shadow */}
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/60 to-transparent z-10"></div>
              
              {/* Main velvet curtain base with gradient - realistic velvet lighting */}
              <div className="absolute inset-0" style={{
                background: `
                  linear-gradient(
                    to bottom,
                    rgba(255,120,120,0.6) 0%,
                    rgba(180,0,0,0.6) 40%,
                    rgba(120,0,0,0.8) 70%,
                    rgba(60,0,0,0.9) 100%
                  )
                `
              }}></div>
              
              {/* Velvet fabric texture overlay */}
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  repeating-linear-gradient(
                    90deg,
                    rgba(0,0,0,0.15) 0px,
                    rgba(0,0,0,0.25) 12px,
                    rgba(255,255,255,0.04) 18px,
                    rgba(0,0,0,0.2) 26px
                  ),
                  url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")
                `,
                backgroundBlendMode: 'overlay, overlay',
                opacity: 0.5
              }}></div>
              
              {/* Deep fabric folds with shadows */}
              {[...Array(14)].map((_, i) => (
                <div key={`fold-${i}`} className="absolute top-0 h-full animate-curtain-sway" style={{
                  left: `${i * 6 + 2}%`,
                  width: '14%',
                  background: `
                    linear-gradient(
                      to bottom,
                      rgba(255,100,100,0.3) 0%,
                      rgba(100,0,0,0.6) 50%,
                      rgba(50,0,0,0.8) 100%
                    )
                  `,
                  boxShadow: 'inset -8px 0 20px rgba(0,0,0,0.5), inset 4px 0 10px rgba(0,0,0,0.3)',
                  animationDelay: `${i * 0.4}s`,
                  transform: `skewX(${-2 + i * 0.4}deg)`
                }}></div>
              ))}
              
              {/* Bottom fabric shadow */}
              <div className="absolute bottom-0 left-0 right-0 h-24" style={{
                background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4) 100%)'
              }}></div>
              
              {/* Soft spotlight from above */}
              <div className="absolute top-0 left-0 right-0 h-1/3" style={{
                background: `
                  radial-gradient(ellipse 50% 100% at 50% 0%, rgba(255,255,255,0.2) 0%, transparent 60%)
                `
              }}></div>
              
              {/* Curtain top valance with pleats */}
              <div className="absolute top-0 left-0 right-0 h-32" style={{
                background: `
                  radial-gradient(ellipse 25% 100% at 10% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                  radial-gradient(ellipse 25% 100% at 30% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                  radial-gradient(ellipse 25% 100% at 50% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                  radial-gradient(ellipse 25% 100% at 70% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                  radial-gradient(ellipse 25% 100% at 90% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                  linear-gradient(180deg, #ff3b3b 0%, #b30000 100%)
                `
              }}></div>
              
              {/* Mai Talent Banner on Curtains */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30">
                <div className="bg-gradient-to-r from-neon-gold via-neon-yellow to-neon-gold px-8 py-3 rounded-lg shadow-[0_0_40px_rgba(255,215,0,0.8),0_0_80px_rgba(255,215,0,0.4)]">
                  <h2 className="text-3xl font-black text-black tracking-widest text-center" style={{
                    textShadow: '2px 2px 0px rgba(255,255,255,0.3), -1px -1px 0px rgba(0,0,0,0.1)'
                  }}>
                    🎤 MAI TALENT 🎤
                  </h2>
                </div>
              </div>
              
              {/* Valance shadow */}
              <div className="absolute top-28 left-0 right-0 h-8" style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)'
              }}></div>
            </div>
          </div>
          
          {/* Theater Curtains - Right - disappears when opened */}
          <div className={`absolute top-0 right-0 h-full transition-all duration-1000 overflow-hidden ${curtainsOpen ? 'w-0 opacity-0 z-0' : 'w-1/2 z-10'}`}>
            <div className={`h-full curtain-right transition-all duration-1000 ${curtainsOpen ? 'w-0' : 'w-full'} ml-auto`}>
              {/* Curtain rod shadow */}
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/60 to-transparent z-10"></div>
              
              {/* Main velvet curtain base with gradient - realistic velvet lighting */}
              <div className="absolute inset-0" style={{
                background: `
                  linear-gradient(
                    to bottom,
                    rgba(255,120,120,0.6) 0%,
                    rgba(180,0,0,0.6) 40%,
                    rgba(120,0,0,0.8) 70%,
                    rgba(60,0,0,0.9) 100%
                  )
                `
              }}></div>
              
              {/* Velvet fabric texture overlay */}
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  repeating-linear-gradient(
                    90deg,
                    rgba(0,0,0,0.15) 0px,
                    rgba(0,0,0,0.25) 12px,
                    rgba(255,255,255,0.04) 18px,
                    rgba(0,0,0,0.2) 26px
                  ),
                  url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")
                `,
                backgroundBlendMode: 'overlay, overlay',
                opacity: 0.5
              }}></div>
              
              {/* Deep fabric folds with shadows */}
              {[...Array(14)].map((_, i) => (
                <div key={`fold-r-${i}`} className="absolute top-0 h-full animate-curtain-sway" style={{
                  right: `${i * 6 + 2}%`,
                  width: '14%',
                  background: `
                    linear-gradient(
                      to bottom,
                      rgba(255,100,100,0.3) 0%,
                      rgba(100,0,0,0.6) 50%,
                      rgba(50,0,0,0.8) 100%
                    )
                  `,
                  boxShadow: 'inset 8px 0 20px rgba(0,0,0,0.5), inset -4px 0 10px rgba(0,0,0,0.3)',
                  animationDelay: `${i * 0.4 + 0.2}s`,
                  transform: `skewX(${2 - i * 0.4}deg)`
                }}></div>
              ))}
              
              {/* Bottom fabric shadow */}
              <div className="absolute bottom-0 left-0 right-0 h-24" style={{
                background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4) 100%)'
              }}></div>
              
              {/* Soft spotlight from above */}
              <div className="absolute top-0 left-0 right-0 h-1/3" style={{
                background: `
                  radial-gradient(ellipse 50% 100% at 50% 0%, rgba(255,255,255,0.2) 0%, transparent 60%)
                `
              }}></div>
              
              {/* Curtain top valance with pleats */}
              <div className="absolute top-0 left-0 right-0 h-32" style={{
                background: `
                  radial-gradient(ellipse 25% 100% at 10% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                  radial-gradient(ellipse 25% 100% at 30% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                  radial-gradient(ellipse 25% 100% at 50% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                  radial-gradient(ellipse 25% 100% at 70% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                  radial-gradient(ellipse 25% 100% at 90% 50%, #ff3b3b 0%, #cc1a1a 50%, #6b0000 100%),
                  linear-gradient(180deg, #ff3b3b 0%, #b30000 100%)
                `
              }}></div>
              
              {/* Mai Talent Banner on Curtains */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30">
                <div className="bg-gradient-to-r from-neon-gold via-neon-yellow to-neon-gold px-8 py-3 rounded-lg shadow-[0_0_40px_rgba(255,215,0,0.8),0_0_80px_rgba(255,215,0,0.4)]">
                  <h2 className="text-3xl font-black text-black tracking-widest text-center" style={{
                    textShadow: '2px 2px 0px rgba(255,255,255,0.3), -1px -1px 0px rgba(0,0,0,0.1)'
                  }}>
                    🎤 MAI TALENT 🎤
                  </h2>
                </div>
              </div>
              
              {/* Valance shadow */}
              <div className="absolute top-28 left-0 right-0 h-8" style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)'
              }}></div>
            </div>
          </div>
          
          {/* Center curtain divider */}
          {!curtainsOpen && (
            <div className="absolute top-0 bottom-0 left-1/2 w-[6px] -translate-x-1/2 pointer-events-none z-20
              bg-gradient-to-b from-black/40 via-black/60 to-black/40 blur-[1px]"></div>
          )}
          
          {/* Stage Spotlights - Top */}
          <div className="absolute top-0 left-0 right-0 h-1/2">
            {/* Left spotlight */}
            <div className="absolute top-0 left-[15%] w-40 h-full">
              <div className="w-full h-full bg-gradient-to-b from-neon-yellow/30 via-orange-500/10 to-transparent spotlight-beam"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-32 bg-gradient-to-b from-white/20 to-transparent blur-xl"></div>
            </div>
            
            {/* Center left spotlight */}
            <div className="absolute top-0 left-[35%] w-48 h-full">
              <div className="w-full h-full bg-gradient-to-b from-neon-gold/25 via-orange-600/10 to-transparent spotlight-beam animation-delay-1000"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-40 bg-gradient-to-b from-white/20 to-transparent blur-xl"></div>
            </div>
            
            {/* Center right spotlight */}
            <div className="absolute top-0 right-[35%] w-48 h-full">
              <div className="w-full h-full bg-gradient-to-b from-candy-red/20 via-red-600/10 to-transparent spotlight-beam animation-delay-500"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-40 bg-gradient-to-b from-white/20 to-transparent blur-xl"></div>
            </div>
            
            {/* Right spotlight */}
            <div className="absolute top-0 right-[15%] w-40 h-full">
              <div className="w-full h-full bg-gradient-to-b from-neon-yellow/25 via-orange-500/10 to-transparent spotlight-beam animation-delay-1500"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-32 bg-gradient-to-b from-white/20 to-transparent blur-xl"></div>
            </div>
          </div>
          
          {/* Stage Floor - Real Wooden Stage */}
          <div className="absolute bottom-0 left-0 right-0 h-44">
            {/* Main brown wooden floor base */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#2b160a] via-[#3b1e0f] to-transparent"></div>
            
            {/* Wood plank texture */}
            <div className="absolute inset-0 opacity-40" style={{
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  rgba(0,0,0,0.2) 0px,
                  rgba(0,0,0,0.2) 4px,
                  transparent 4px,
                  transparent 60px
                )
              `
            }}></div>
            
            {/* Additional wood grain texture */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 40px,
                  rgba(0,0,0,0.1) 40px,
                  rgba(0,0,0,0.1) 42px
                )
              `
            }}></div>
            
            {/* Stage edge highlight */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-[#a0522d] to-transparent"></div>
            
            {/* Floor reflection */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neon-gold/5 to-transparent"></div>
            
            {/* Stage front lip shadow */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/40 to-transparent"></div>
            
            {/* Stage edge decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-neon-gold/30 to-transparent"></div>
          </div>
          
          {/* Audience - Theater Seats with detailed seating */}
          <div className="absolute bottom-0 left-0 right-0 h-48">
            {/* Dark theater seating area background */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-[#0a0a0a] to-[#1a1510]"></div>
            
            {/* Theater ceiling/walls in background */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#0d0d0d] to-transparent"></div>
            
            {/* Seat Rows - Multiple rows of detailed theater seats */}
            {/* Row 1 - Back row (furthest) */}
            <div className="absolute bottom-24 left-0 right-0 flex justify-center">
              <div className="flex justify-center gap-1">
                {Array.from({ length: 80 }).map((_, i) => (
                  <div key={`row1-${i}`} className="seat-row-1" style={{ width: '8px', height: '12px' }}>
                    <div className="seat-back" style={{ backgroundColor: '#1a1a1a' }}></div>
                    <div className="seat-cushion" style={{ backgroundColor: '#2a1a1a' }}></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Row 2 */}
            <div className="absolute bottom-20 left-0 right-0 flex justify-center">
              <div className="flex justify-center gap-1">
                {Array.from({ length: 75 }).map((_, i) => (
                  <div key={`row2-${i}`} className="seat-row-2" style={{ width: '9px', height: '14px' }}>
                    <div className="seat-back" style={{ backgroundColor: '#252525' }}></div>
                    <div className="seat-cushion" style={{ backgroundColor: '#3a2525' }}></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Row 3 */}
            <div className="absolute bottom-16 left-0 right-0 flex justify-center">
              <div className="flex justify-center gap-1">
                {Array.from({ length: 70 }).map((_, i) => (
                  <div key={`row3-${i}`} className="seat-row-3" style={{ width: '10px', height: '16px' }}>
                    <div className="seat-back" style={{ backgroundColor: '#2a2a2a' }}></div>
                    <div className="seat-cushion" style={{ backgroundColor: '#4a2a2a' }}></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Row 4 */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center">
              <div className="flex justify-center gap-1">
                {Array.from({ length: 65 }).map((_, i) => (
                  <div key={`row4-${i}`} className="seat-row-4" style={{ width: '11px', height: '18px' }}>
                    <div className="seat-back" style={{ backgroundColor: '#303030' }}></div>
                    <div className="seat-cushion" style={{ backgroundColor: '#5a3030' }}></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Row 5 - Front row */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <div className="flex justify-center gap-1">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div key={`row5-${i}`} className="seat-row-5" style={{ width: '12px', height: '20px' }}>
                    <div className="seat-back" style={{ backgroundColor: '#3a3a3a' }}></div>
                    <div className="seat-cushion" style={{ backgroundColor: '#6a3a3a' }}></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Aisle decorations */}
            <div className="absolute bottom-0 left-1/4 w-2 h-full bg-black/50"></div>
            <div className="absolute bottom-0 right-1/4 w-2 h-full bg-black/50"></div>
            <div className="absolute bottom-0 left-1/2 w-3 h-full bg-black/60"></div>
            
            {/* Row armrests detail */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-black/30 to-transparent"></div>
            
            {/* Stage light glow on audience */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neon-gold/15 via-transparent to-transparent"></div>
            
            {/* Real Audience Seating Rows - Theater Chairs */}
            <div className="absolute bottom-0 left-0 right-0 h-36 flex flex-col justify-end items-center pointer-events-none">
              {[0, 1, 2].map((r) => (
                <div 
                  key={r} 
                  className="flex gap-2 mb-2 opacity-[0.7]"
                  style={{ transform: `scale(${1 - r * 0.15})` }}
                >
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-5 h-6 bg-gradient-to-b from-[#5a0000] to-[#2b0000] rounded-t-md shadow-inner"
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Stage Atmosphere - Light Haze */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle_at_center,rgba(255,200,120,0.15),transparent 70%)'
          }}></div>
          
          {/* Stage Spotlights - Additional angled beams */}
          <div className="absolute top-0 left-[20%] w-64 h-full bg-gradient-to-b from-yellow-300/30 to-transparent blur-xl"></div>
          <div className="absolute top-0 right-[20%] w-64 h-full bg-gradient-to-b from-yellow-300/30 to-transparent blur-xl"></div>
          
          {/* Floating Particles / Stage Dust */}
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full bg-white/30 particle-float"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDuration: `${particle.duration}s`,
                animationDelay: `${particle.delay}s`
              }}
            />
          ))}
          
          {/* Animated light beams overlay */}
          <div className="absolute inset-0 beam-overlay"></div>
        </div>

        {/* ==================== STAGE CONTENT ==================== */}
        <div className={`relative z-10 flex-1 flex flex-col p-4 mr-80 transition-all duration-1000 ${curtainsOpen ? 'opacity-100' : 'opacity-0'}`}>
          {/* Pre-show: Show host box in center with countdown */}
          {showState === 'pre-show' && curtainsOpen && (
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Large Host Box in Center for Pre-show */}
              <div className="w-[600px] aspect-video mx-auto mb-8 animate-in fade-in zoom-in duration-300">
                <div className="w-full h-full relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-candy-red/20 via-transparent to-candy-red/10 rounded-xl"></div>
                  <div className="absolute inset-0 rounded-xl border-2 border-candy-red/60 shadow-[0_0_30px_rgba(255,26,26,0.4)]"></div>
                  <div className="absolute inset-2 rounded-lg overflow-hidden bg-gray-900">
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-4 border-candy-red mb-3 shadow-[0_0_30px_rgba(255,26,26,0.5)]">
                          <img src={hostBox.avatar || `https://i.pravatar.cc/150?u=host`} alt="Host" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-candy-red font-bold text-xl flex items-center justify-center gap-2">
                          <Mic className="w-5 h-5" />
                          {hostBox.username}
                        </p>
                        <p className="text-gray-400 text-sm mt-2">Your Host</p>
                      </div>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="bg-candy-red/80 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        HOST
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Pre-show Countdown Timer */}
              <div className="text-center">
                <p className="text-neon-yellow text-lg mb-4 flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  Show Starting Soon!
                </p>
                <div className="flex items-center gap-4">
                  {[
                    { value: preShowCountdown.hours, label: 'Hours' },
                    { value: preShowCountdown.minutes, label: 'Mins' },
                    { value: preShowCountdown.seconds, label: 'Secs' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="countdown-digit w-16 h-20 rounded-lg flex items-center justify-center text-4xl font-bold text-neon-yellow bg-black/40 border border-neon-yellow/30">
                        {String(item.value).padStart(2, '0')}
                      </div>
                      <span className="text-xs text-gray-400 mt-2">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Pre-show message */}
              <p className="text-gray-400 mt-8 text-center">
                Get ready for an amazing show! Performers, have your tracks ready.
              </p>
            </div>
          )}
          
          {/* Live Show: Show performers on stage */}
          {(showState === 'live' || showState === 'post-show') && curtainsOpen && (
            <div className="flex-1 flex flex-row items-center justify-center gap-4">
            {/* Performer 1 - Left Panel (Current Performer) */}
            <div 
              className={`flex-1 max-w-[48%] aspect-[16/9] transition-all duration-300 cursor-pointer hover:scale-[1.02] ${giftRecipient === performerBoxes[0].userId ? 'ring-4 ring-neon-gold' : ''}`}
              onClick={() => performerBoxes[0].isPerforming && setGiftRecipient(performerBoxes[0].userId)}
            >
              <div className={`w-full h-full relative stage-screen ${performerBoxes[0].isPerforming ? 'active' : ''}`}>
                {/* Screen glow effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-neon-gold/20 via-transparent to-neon-gold/10 rounded-xl"></div>
                
                {/* Screen border glow */}
                <div className="absolute inset-0 rounded-xl border-2 border-neon-gold/50 shadow-[0_0_30px_rgba(255,215,0,0.3)]"></div>
                
                {displayPerformers[0].isPerforming ? (
                  <>
                    {/* Performer content */}
                    <div className="absolute inset-2 rounded-lg overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
                        {/* Stage screen content */}
                        <div className="text-center">
                          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-neon-gold mb-3 shadow-[0_0_30px_rgba(255,215,0,0.5)]">
                            <img src={displayPerformers[0].avatar || `https://i.pravatar.cc/150?u=${displayPerformers[0].userId}`} alt={displayPerformers[0].username} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-neon-gold font-bold text-xl text-glow-gold">{displayPerformers[0].username}</p>
                        </div>
                      </div>
                      
                      {/* Top badges */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                        <div className="flex gap-2">
                          <span className="bg-candy-red/80 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            LIVE
                          </span>
                          <span className="bg-neon-purple/80 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {displayPerformers[0].viewerCount?.toLocaleString() || '0'}
                          </span>
                        </div>
                        <span className="bg-black/60 text-neon-yellow px-3 py-1 rounded text-xs font-bold">
                          Performer
                        </span>
                      </div>
                      
                      {/* Performer Publish Checkbox */}
                      {user?.id === displayPerformers[0].userId && displayPerformers[0].isPerforming && (
                        <div className="absolute top-14 left-3">
                          <label className="flex items-center gap-1 px-2 py-1 rounded bg-black/60 border border-neon-gold/50 cursor-pointer hover:bg-black/80">
                            <input
                              type="checkbox"
                              checked={performerPublishEnabled[0]}
                              onChange={(e) => handlePerformerPublishToggle(0, e.target.checked)}
                              className="w-3 h-3 accent-neon-gold"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Video className="w-3 h-3 text-neon-gold" />
                            <span className="text-xs font-bold text-neon-gold">
                              {performerPublishEnabled[0] ? 'Publishing' : 'Publish Track'}
                            </span>
                          </label>
                        </div>
                      )}
                      
                      {/* Bottom stats */}
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                        <div className="flex gap-2">
                          <span className="bg-neon-gold/30 text-neon-gold px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            {displayPerformers[0].score} pts
                          </span>
                          <span className="bg-candy-red/30 text-candy-red px-3 py-1.5 rounded text-sm flex items-center gap-1">
                            <Gift className="w-4 h-4" />
                            {displayPerformers[0].gifts}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {/* Judge voting buttons on performer box */}
                          {judgeBoxes.some(j => j.isJoined) && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleJudgeVote(0, 'yes')}
                                className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 bg-green-500/70 hover:bg-green-500 text-white"
                                title="Vote YES for this performer"
                              >
                                ✓ YES
                              </button>
                              <button
                                onClick={() => handleJudgeVote(0, 'no')}
                                className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 bg-red-500/70 hover:bg-red-500 text-white"
                                title="Vote NO for this performer"
                              >
                                ✗ NO
                              </button>
                            </div>
                          )}
                          <button 
                            onClick={() => handleVote(performerBoxes[0].userId)}
                            className="btn-neon-red px-4 py-2 rounded-full text-sm flex items-center gap-1"
                          >
                            <Gift className="w-4 h-4" />
                            Gift
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-2 rounded-lg bg-gray-900/80 flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500">Waiting for performer</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Host Box - appears in center when speaking - much larger for center of attention */}
            {curtainsOpen && hostBox.isSpeaking && (
              <div className="w-[600px] aspect-video mx-12 animate-in fade-in slide-in-from-bottom-4 duration-300 z-[60]">
                <div className="w-full h-full relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-candy-red/20 via-transparent to-candy-red/10 rounded-xl"></div>
                  <div className="absolute inset-0 rounded-xl border-2 border-candy-red/60 shadow-[0_0_30px_rgba(255,26,26,0.4)]"></div>
                  <div className="absolute inset-2 rounded-lg overflow-hidden bg-gray-900">
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border-3 border-candy-red mb-2 shadow-[0_0_20px_rgba(255,26,26,0.5)]">
                          <img src={hostBox.avatar || `https://i.pravatar.cc/150?u=host`} alt="Host" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-candy-red font-bold text-sm flex items-center justify-center gap-1">
                          <Mic className="w-4 h-4" />
                          {hostBox.username}
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="bg-candy-red/80 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performer 2 - Right Panel (Host or Challenger) */}
            <div 
              className={`flex-1 max-w-[48%] aspect-[16/9] transition-all duration-300 cursor-pointer hover:scale-[1.02] ${giftRecipient === performerBoxes[1].userId ? 'ring-4 ring-neon-purple' : ''}`}
              onClick={() => performerBoxes[1].isPerforming && setGiftRecipient(performerBoxes[1].userId)}
            >
              <div className={`w-full h-full relative stage-screen ${performerBoxes[1].isPerforming ? 'active' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-neon-purple/20 via-transparent to-neon-purple/10 rounded-xl"></div>
                <div className="absolute inset-0 rounded-xl border-2 border-neon-purple/50 shadow-[0_0_30px_rgba(147,51,234,0.3)]"></div>
                
                {performerBoxes[1].isPerforming ? (
                  <>
                    <div className="absolute inset-2 rounded-lg overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-neon-purple mb-3 shadow-[0_0_30px_rgba(147,51,234,0.5)]">
                            <img src={performerBoxes[1].avatar || `https://i.pravatar.cc/150?u=${performerBoxes[1].userId}`} alt={performerBoxes[1].username} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-neon-purple font-bold text-xl">{performerBoxes[1].username}</p>
                        </div>
                      </div>
                      
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                        <div className="flex gap-2">
                          <span className="bg-neon-purple/80 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            LIVE
                          </span>
                          <span className="bg-neon-yellow/80 text-black px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {performerBoxes[1].viewerCount?.toLocaleString() || '0'}
                          </span>
                        </div>
                        <span className="bg-black/60 text-neon-purple px-3 py-1 rounded text-xs font-bold">
                          Challenger
                        </span>
                      </div>
                      
                      {/* Performer Publish Checkbox for Performer 2 */}
                      {user?.id === performerBoxes[1].userId && performerBoxes[1].isPerforming && (
                        <div className="absolute top-14 left-3">
                          <label className="flex items-center gap-1 px-2 py-1 rounded bg-black/60 border border-neon-purple/50 cursor-pointer hover:bg-black/80">
                            <input
                              type="checkbox"
                              checked={performerPublishEnabled[1]}
                              onChange={(e) => handlePerformerPublishToggle(1, e.target.checked)}
                              className="w-3 h-3 accent-neon-purple"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Video className="w-3 h-3 text-neon-purple" />
                            <span className="text-xs font-bold text-neon-purple">
                              {performerPublishEnabled[1] ? 'Publishing' : 'Publish Track'}
                            </span>
                          </label>
                        </div>
                      )}
                      
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                        <div className="flex gap-2">
                          <span className="bg-neon-purple/30 text-neon-purple px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            {performerBoxes[1].score} pts
                          </span>
                          <span className="bg-candy-red/30 text-candy-red px-3 py-1.5 rounded text-sm flex items-center gap-1">
                            <Gift className="w-4 h-4" />
                            {performerBoxes[1].gifts}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {/* Judge voting buttons on performer box */}
                          {judgeBoxes.some(j => j.isJoined) && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleJudgeVote(1, 'yes')}
                                className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 bg-green-500/70 hover:bg-green-500 text-white"
                                title="Vote YES for this performer"
                              >
                                ✓ YES
                              </button>
                              <button
                                onClick={() => handleJudgeVote(1, 'no')}
                                className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 bg-red-500/70 hover:bg-red-500 text-white"
                                title="Vote NO for this performer"
                              >
                                ✗ NO
                              </button>
                            </div>
                          )}
                          <button 
                            onClick={() => handleVote(performerBoxes[1].userId)}
                            className="btn-neon-purple px-4 py-2 rounded-full text-sm flex items-center gap-1"
                          >
                            <Gift className="w-4 h-4" />
                            Gift
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-2 rounded-lg bg-gray-900/80 flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500">Waiting for challenger</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
          {/* Timer Display */}
          <div className="flex justify-center mb-4">
            {isSuddenDeath ? (
              <div className="bg-candy-red px-10 py-4 rounded-full flex items-center gap-4 animate-pulse shadow-[0_0_40px_rgba(255,26,26,0.6)]">
                <AlertTriangle className="w-8 h-8" />
                <span className="text-white font-bold text-3xl">SUDDEN DEATH: {suddenDeathTimer}s</span>
              </div>
            ) : isTimerRunning ? (
              <div className={`px-10 py-4 rounded-full flex items-center gap-4 ${
                timer <= 10 ? 'bg-candy-red animate-pulse shadow-[0_0_40px_rgba(255,26,26,0.6)]' : 'bg-neon-gold shadow-[0_0_40px_rgba(255,215,0,0.5)]'
              }`}>
                <Clock className="w-8 h-8 text-black" />
                <span className="text-black font-bold text-3xl">{formatTime(timer)}</span>
                <span className="text-black/70 text-lg">remaining</span>
              </div>
            ) : (
              <div className="text-gray-400 text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Ready for performance
              </div>
            )}
          </div>

          {/* Judges Panel - Front of Stage with Host Box */}
          <div className="mb-4">
            <div className="bg-gradient-to-r from-transparent via-black/60 to-transparent px-4 py-3">
              <div className="flex justify-center gap-4 items-end">
                {/* Small Host Box - next to 4th judge seat when not speaking */}
                {curtainsOpen && !hostBox.isSpeaking && (
                  <div 
                    className="w-36 pb-1 z-[60] relative cursor-pointer hover:ring-2 hover:ring-candy-red"
                    onClick={() => {
                      if (isHost && !isPublishingVideo) {
                        handleJoinAsHost()
                      }
                    }}
                  >
                    <div className="w-full aspect-[3/4] rounded-lg overflow-hidden glass border-2 border-candy-red/60">
                      <div className="relative w-full h-full">
                        {isPublishingVideo && currentUserRole === 'host' ? (
                          <AgoraVideo
                            videoTrack={agora.localVideoTrack}
                            userId={user?.id || 'host'}
                            username={user?.username || 'Host'}
                            avatar={hostBox.avatar || undefined}
                            isMuted={isMuted}
                            isLocal={true}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
                            <div className="text-center">
                              {!isPublishingVideo ? (
                                <>
                                  <div className="w-10 h-10 mx-auto rounded-full overflow-hidden border-2 border-candy-red mb-1">
                                    <img src={hostBox.avatar || `https://i.pravatar.cc/150?u=host`} alt="Host" className="w-full h-full object-cover" />
                                  </div>
                                  <p className="text-candy-red text-xs font-bold flex items-center justify-center gap-1">
                                    <Crown className="w-3 h-3" />
                                    {hostBox.username}
                                  </p>
                                  <p className="text-gray-500 text-xs">Click to go live</p>
                                </>
                              ) : (
                                <>
                                  <div className="w-10 h-10 mx-auto rounded-full overflow-hidden border-2 border-green-500 mb-1 animate-pulse">
                                    <img src={hostBox.avatar || `https://i.pravatar.cc/150?u=host`} alt="Host" className="w-full h-full object-cover" />
                                  </div>
                                  <p className="text-green-500 text-xs font-bold">LIVE</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Judge boxes */}
                {judgeBoxes.map((judge, idx) => (
                  <div key={judge.id} className="w-44">
                    <div 
                      className={`w-full aspect-[3/4] relative rounded-lg overflow-hidden judge-card ${judge.isJoined ? 'joined' : ''} cursor-pointer hover:ring-2 hover:ring-neon-purple`}
                      onClick={() => {
                        if (!judge.isJoined && user && (isCeo || isAdmin)) {
                          // Join as this judge and start publishing
                          handleJoinAsJudge(judge.id)
                        }
                      }}
                    >
                      {judge.isJoined ? (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/40 via-transparent to-neon-purple/20"></div>
                          <div className="absolute inset-0 rounded-lg border-2 border-neon-purple/60 shadow-[0_0_25px_rgba(147,51,234,0.4)]"></div>
                          {isPublishingVideo && currentUserRole === 'judge' && user?.id === judge.userId ? (
                            <AgoraVideo
                              videoTrack={agora.localVideoTrack}
                              userId={judge.userId || String(judge.id)}
                              username={judge.username || 'Judge'}
                              avatar={judge.avatar || undefined}
                              isMuted={isMuted}
                              isLocal={true}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center">
                              <div className="text-center">
                                <div className="w-14 h-14 mx-auto rounded-full overflow-hidden border-3 border-neon-purple mb-2 shadow-[0_0_15px_rgba(147,51,234,0.5)]">
                                  <img src={judge.avatar || `https://i.pravatar.cc/150?u=judge${idx}`} alt={judge.username || 'Judge'} className="w-full h-full object-cover" />
                                </div>
                                <p className="text-neon-purple text-xs font-bold flex items-center justify-center gap-1">
                                  <Gavel className="w-3 h-3" />
                                  {judge.username}
                                </p>
                                <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                                  judge.role === 'CEO' ? 'bg-neon-gold/30 text-neon-gold' : 
                                  judge.role === 'Host' ? 'bg-candy-red/30 text-candy-red' :
                                  'bg-neon-purple/30 text-neon-purple'
                                }`}>
                                  {judge.role || 'Judge'}
                                </span>
                                <span className="text-xs text-green-400 flex items-center justify-center gap-1 mt-2">
                                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                  LIVE
                                </span>
                              </div>
                              {/* YES/NO Voting Buttons for Judges */}
                              {user && performerBoxes[0].isPerforming && (
                                <div className="mt-3 flex gap-2">
                                  <button
                                    onClick={() => handleJudgeVote(0, 'yes')}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                                      judge.vote === 'yes' 
                                        ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]' 
                                        : 'bg-green-500/50 hover:bg-green-500 text-white'
                                    }`}
                                  >
                                    ✓ YES
                                  </button>
                                  <button
                                    onClick={() => handleJudgeVote(0, 'no')}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                                      judge.vote === 'no' 
                                        ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                                        : 'bg-red-500/50 hover:bg-red-500 text-white'
                                    }`}
                                  >
                                    ✗ NO
                                  </button>
                                </div>
                              )}
                              
                              {/* Judge can send gifts directly from their panel */}
                              {user && performerBoxes[0].isPerforming && (
                                <button
                                  onClick={() => {
                                    if (selectedGift) {
                                      handleSendGift(performerBoxes[0].userId)
                                    } else {
                                      alert('Select a gift first from the gift panel!')
                                    }
                                  }}
                                  className="mt-2 px-3 py-1.5 bg-candy-red/80 hover:bg-candy-red rounded-full text-xs font-bold flex items-center gap-1"
                                >
                                  <Gift className="w-3 h-3" />
                                  Send Gift
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center glass-dark border border-neon-purple/30">
                            <div className="text-center text-gray-500 mb-2">
                              <Gavel className="w-8 h-8 mx-auto mb-1 opacity-50" />
                              <p className="text-xs">Seat {idx + 1}</p>
                            </div>
                            {user && (isCeo || isAdmin) && (
                              <button
                                onClick={() => handleJoinJudgeSeat(judge.id)}
                                className="px-4 py-1.5 bg-neon-purple/80 hover:bg-neon-purple rounded-full text-xs font-bold"
                              >
                                Join
                              </button>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                ))}

                {/* CEO Box - Golden themed, only CEO can join */}
                <div className="w-44">
                  <div 
                    className={`w-full aspect-[3/4] relative rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-neon-gold ${
                      ceoBox.isJoined 
                        ? 'border-2 border-neon-gold shadow-[0_0_25px_rgba(255,215,0,0.6)]' 
                        : 'glass border border-neon-gold/30'
                    }`}
                    onClick={() => {
                      if (!ceoBox.isJoined && user && isCeo) {
                        handleJoinAsCeo()
                      }
                    }}
                  >
                    {ceoBox.isJoined ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-neon-gold/40 via-transparent to-neon-gold/20"></div>
                        <div className="absolute inset-0 rounded-lg border-2 border-neon-gold/60 shadow-[0_0_25px_rgba(255,215,0,0.4)]"></div>
                        {isCeoPublishing && user?.id === ceoBox.userId ? (
                          <AgoraVideo
                            videoTrack={agora.localVideoTrack}
                            userId={ceoBox.userId || 'ceo'}
                            username={ceoBox.username || 'CEO'}
                            avatar={ceoBox.avatar || undefined}
                            isMuted={isMuted}
                            isLocal={true}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center">
                            <div className="text-center">
                              <div className="w-14 h-14 mx-auto rounded-full overflow-hidden border-3 border-neon-gold mb-2 shadow-[0_0_15px_rgba(255,215,0,0.5)]">
                                <img src={ceoBox.avatar || `https://i.pravatar.cc/150?u=ceo`} alt={ceoBox.username || 'CEO'} className="w-full h-full object-cover" />
                              </div>
                              <p className="text-neon-gold text-xs font-bold flex items-center justify-center gap-1">
                                <Crown className="w-3 h-3" />
                                {ceoBox.username}
                              </p>
                              <span className="text-xs px-2 py-0.5 rounded mt-1 inline-block bg-neon-gold/30 text-neon-gold">
                                CEO
                              </span>
                              <span className="text-xs text-green-400 flex items-center justify-center gap-1 mt-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                LIVE
                              </span>
                            </div>
                          </div>
                        )}
                        {/* CEO can send gifts */}
                        {user && performerBoxes[0].isPerforming && (
                          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleJudgeVote(0, 'yes'); }}
                                className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 bg-green-500/50 hover:bg-green-500 text-white"
                              >
                                ✓ YES
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleJudgeVote(0, 'no'); }}
                                className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 bg-red-500/50 hover:bg-red-500 text-white"
                              >
                                ✗ NO
                              </button>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLeaveCeoSeat(); }}
                          className="absolute top-1 right-1 px-2 py-1 bg-candy-red/80 hover:bg-candy-red rounded text-xs"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center glass-dark border border-neon-gold/30">
                        <div className="text-center text-gray-500 mb-2">
                          <Crown className="w-8 h-8 mx-auto mb-1 opacity-50 text-neon-gold" />
                          <p className="text-xs">CEO Seat</p>
                        </div>
                        {user && isCeo && (
                          <button
                            onClick={() => handleJoinAsCeo()}
                            className="px-4 py-1.5 bg-neon-gold/80 hover:bg-neon-gold rounded-full text-xs font-bold text-black"
                          >
                            Join as CEO
                          </button>
                        )}
                        {!user && (
                          <p className="text-xs text-gray-600">Login to join</p>
                        )}
                        {user && !isCeo && (
                          <p className="text-xs text-gray-600">CEO only</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Host Controls */}
          <div className={`flex items-center justify-between px-4 z-[60] relative transition-opacity duration-500 ${curtainsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex items-center gap-3">
              {/* Host Speak Button */}
              {isHost && (
                <button
                  onClick={handleHostSpeak}
                  className={`px-5 py-2.5 rounded-full flex items-center gap-2 font-bold ${
                    hostBox.isSpeaking 
                      ? 'bg-candy-red text-white shadow-[0_0_20px_rgba(255,26,26,0.5)]' 
                      : 'btn-neon-gold'
                  }`}
                >
                  {hostBox.isSpeaking ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      Stop Speaking
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Speak
                    </>
                  )}
                </button>
              )}

              {/* Host Publish Checkbox - allows host to start/stop publishing */}
              {isHost && (
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-800 border border-candy-red/50 cursor-pointer hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={hostPublishEnabled}
                    onChange={(e) => handleHostPublishToggle(e.target.checked)}
                    className="w-4 h-4 accent-candy-red"
                  />
                  <Video className="w-4 h-4 text-candy-red" />
                  <span className="text-sm font-bold text-white">
                    {hostPublishEnabled ? 'Publishing' : 'Go Live'}
                  </span>
                </label>
              )}

              {/* Curtain Toggle Button */}
              {isHost && (
                <button
                  onClick={handleToggleCurtains}
                  className={`px-4 py-2.5 rounded-full flex items-center gap-2 font-bold ${
                    curtainsOpen 
                      ? 'bg-neon-purple text-white' 
                      : 'bg-neon-yellow text-black'
                  }`}
                >
                  {curtainsOpen ? '🔒 Close' : '🎭 Open'}
                </button>
              )}
              
              {/* Host Action Buttons */}
              {isHost && (
                <>
                  {showState === 'pre-show' && (
                    <button 
                      onClick={startShow}
                      className="btn-neon-red px-4 py-2.5 rounded-full flex items-center gap-2 text-sm"
                    >
                      <Play className="w-4 h-4" />
                      Start Show
                    </button>
                  )}
                  {showState === 'live' && (
                    <>
                      <button 
                        onClick={handleStartPerformance}
                        disabled={queue.length === 0}
                        className="btn-neon-red px-4 py-2.5 rounded-full flex items-center gap-2 text-sm disabled:opacity-50"
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                      <button 
                        onClick={handleNextPerformer}
                        className="btn-neon-gold px-4 py-2.5 rounded-full flex items-center gap-2 text-sm"
                      >
                        <SkipForward className="w-4 h-4" />
                        Next
                      </button>
                    </>
                  )}
                  {showState === 'post-show' && (
                    <button 
                      onClick={endShow}
                      className="btn-neon-purple px-4 py-2.5 rounded-full flex items-center gap-2 text-sm"
                    >
                      <Crown className="w-4 h-4" />
                      End Show
                    </button>
                  )}
                </>
              )}

              {/* Also allow judges and CEO to end the show */}
              {showState === 'post-show' && (isCeo || isAdmin) && !isHost && (
                <button 
                  onClick={endShow}
                  className="btn-neon-purple px-4 py-2.5 rounded-full flex items-center gap-2 text-sm"
                >
                  <Crown className="w-4 h-4" />
                  End Show
                </button>
              )}

              {/* Join as Host Button */}
              {isHost && !isPublishingVideo && curtainsOpen && (
                <button
                  onClick={handleJoinAsHost}
                  className="btn-neon-red px-4 py-2.5 rounded-full flex items-center gap-2 text-sm"
                >
                  <Video className="w-4 h-4" />
                  Go Live
                </button>
              )}

              {/* Join Queue Button - for regular users (allow joining when show is live) */}
              {!isHost && !isPublishingVideo && !isInQueue && user && curtainsOpen && (
                <button
                  onClick={handleJoinQueue}
                  disabled={queue.length >= 52}
                  className="btn-neon-gold px-4 py-2.5 rounded-full flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Users className="w-4 h-4" />
                  Join Queue ({queue.length}/52)
                </button>
              )}

              {/* Leave Queue Button */}
              {!isHost && !isPublishingVideo && isInQueue && (
                <button
                  onClick={handleLeaveQueue}
                  className="btn-neon-purple px-4 py-2.5 rounded-full flex items-center gap-2 text-sm"
                >
                  Leave Queue
                </button>
              )}

              {/* Video Controls - show when publishing */}
              {isPublishingVideo && (
                <VideoControls
                  isMuted={isMuted}
                  isVideoOff={isVideoOff}
                  isScreenSharing={agora.isScreenSharing}
                  onToggleMute={handleToggleMute}
                  onToggleVideo={handleToggleVideo}
                  onToggleScreenShare={agora.startScreenShare}
                  onLeave={handleLeave}
                />
              )}
            </div>

            {/* Queue Preview */}
            {isHost && queue.length > 0 && (
              <div className="flex items-center gap-3 text-sm text-gray-400 bg-black/40 px-4 py-2 rounded-full">
                <Users className="w-4 h-4" />
                <span>{queue.length} in queue</span>
              </div>
            )}
          </div>
        </div>

        {/* Only show chat/gifts panel when curtains are open */}
        {curtainsOpen && (
        <div className="absolute right-4 top-4 bottom-4 w-64 flex flex-col gap-3 z-20">
          {/* Chat Panel */}
          <div className="flex-1 glass-dark rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-white/10 bg-gradient-to-r from-candy-red/20 to-transparent">
              <h3 className="text-sm font-bold text-neon-yellow flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Live Chat
              </h3>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.slice(-20).map((msg, idx) => (
                <div 
                  key={msg.id || idx} 
                  className="text-xs chat-message animate-in fade-in slide-in-from-left-2 group flex items-start gap-2"
                >
                  {/* Clickable Username - show actual username */}
                  <button 
                    onClick={() => {
                      // Click username to send gift to them
                      if (msg.user_id && msg.user_id !== user?.id) {
                        setGiftRecipient(msg.user_id)
                      }
                    }}
                    className="font-bold text-neon-gold hover:text-neon-yellow hover:underline flex-shrink-0"
                    title="Click to send gift"
                  >
                    {chatUsernames[msg.user_id] || 'User'}
                  </button>
                  <span className="text-gray-300 ml-1 break-words flex-1">{msg.message}</span>
                  
                  {/* Delete button for CEO/Admin */}
                  {(isCeo || isAdmin) && (
                    <button
                      onClick={async () => {
                        // Remove message from database
                        const { error } = await supabase
                          .from('chat_messages')
                          .delete()
                          .eq('id', msg.id)
                        
                        if (!error) {
                          // Remove from local state
                          removeChatMessage(msg.id)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-candy-red flex-shrink-0"
                      title="Delete message"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {chatMessages.length === 0 && (
                <div className="text-gray-500 text-center text-sm py-8">
                  Chat messages will appear here
                </div>
              )}
            </div>
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Say something..."
                  className="flex-1 h-9 px-3 rounded-full bg-white/10 text-white text-sm border border-white/20 focus:border-neon-gold focus:outline-none"
                />
                <button type="submit" className="btn-neon-gold px-3 rounded-full">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Gift Panel */}
          <div className="glass-dark rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <Gift className="w-4 h-4 text-candy-red" />
              Send a Gift
            </p>
            
            {/* Selected Recipient Indicator */}
            {giftRecipient ? (
              <div className="mb-3 p-2 rounded-lg bg-neon-gold/20 border border-neon-gold/50 flex items-center justify-between">
                <span className="text-xs text-neon-gold">
                  Sending to: <strong>{performerBoxes.find(p => p.userId === giftRecipient)?.username || 'Unknown'}</strong>
                </span>
                <button 
                  onClick={() => setGiftRecipient(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="mb-3 p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-xs text-gray-400">
                Click on a performer to select who to gift!
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-2">
              {giftOptions.map((gift) => (
                <button
                  key={gift.name}
                  onClick={() => setSelectedGift(gift)}
                  disabled={!giftRecipient}
                  className={`p-2 rounded-lg flex flex-col items-center transition-all ${
                    selectedGift?.name === gift.name
                      ? 'bg-neon-gold/20 border-2 border-neon-gold shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                      : giftRecipient 
                        ? 'hover:bg-white/10 border border-transparent'
                        : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl">{gift.emoji}</span>
                  <span className="text-xs text-gray-400 mt-1">{gift.price} coins</span>
                </button>
              ))}
            </div>
            {selectedGift && giftRecipient && (
              <button
                onClick={() => {
                  handleSendGift(giftRecipient)
                  setGiftRecipient(null)
                  setSelectedGift(null)
                }}
                className="w-full mt-3 btn-neon-red py-2.5 rounded-full font-bold flex items-center justify-center gap-2"
              >
                <Gift className="w-5 h-5" />
                Send {selectedGift.emoji} Now!
              </button>
            )}
            {selectedGift && !giftRecipient && (
              <button
                disabled
                className="w-full mt-3 bg-gray-600 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Gift className="w-5 h-5" />
                Select a performer first!
              </button>
            )}
          </div>
        </div>
        )}

        {/* Traveling Gift Animation */}
        {curtainsOpen && travelingGift && (
          <div className="absolute inset-0 pointer-events-none z-30">
            <div className="absolute top-1/2 left-0 travel-gift animate-travel-gift">
              <span className="text-4xl">{travelingGift.emoji}</span>
            </div>
          </div>
        )}
        
        {/* Winner Display with Confetti and Banner */}
        {showWinner && winner && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            {/* Confetti Effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {confettiParticles.map((p) => (
                <div
                  key={p.id}
                  className="absolute animate-confetti"
                  style={{
                    left: `${p.left}%`,
                    top: '-20px',
                    backgroundColor: p.color,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    borderRadius: p.isCircle ? '50%' : '0',
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration}s`
                  }}
                />
              ))}
            </div>
            
            {/* Winner Overlay */}
            <div className="bg-black/80 absolute inset-0 z-40"></div>
            
            {/* Winner Box */}
            <div className="relative z-50 transform scale-110">
              {/* Winner Banner */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gradient-to-r from-neon-gold via-neon-yellow to-neon-gold px-8 py-3 rounded-full shadow-[0_0_40px_rgba(255,215,0,0.8),0_0_80px_rgba(255,215,0,0.4)]">
                <h2 className="text-3xl font-black text-black text-center" style={{ textShadow: '2px 2px 0px rgba(255,255,255,0.3)' }}>
                  {winner === 'draw' ? '🤝 IT\'S A DRAW!' : '🏆 WINNER! 🏆'}
                </h2>
              </div>
              
              {/* Winner Performer Box */}
              <div className={`w-80 p-6 rounded-2xl border-4 ${
                winner === 'performer1' 
                  ? 'bg-gradient-to-br from-neon-gold/30 to-neon-gold/10 border-neon-gold shadow-[0_0_50px_rgba(255,215,0,0.6)]' 
                  : winner === 'performer2'
                  ? 'bg-gradient-to-br from-neon-purple/30 to-neon-purple/10 border-neon-purple shadow-[0_0_50px_rgba(147,51,234,0.6)]'
                  : 'bg-gradient-to-br from-gray-500/30 to-gray-500/10 border-gray-400 shadow-[0_0_50px_rgba(128,128,128,0.6)]'
              }`}>
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 mb-4 shadow-lg">
                    <img 
                      src={winner === 'performer1' 
                        ? performerBoxes[0].avatar 
                        : winner === 'performer2' 
                        ? performerBoxes[1].avatar 
                        : 'https://i.pravatar.cc/150?u=draw'
                      } 
                      alt="Winner" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <h3 className={`text-2xl font-bold mb-2 ${
                    winner === 'performer1' ? 'text-neon-gold' : winner === 'performer2' ? 'text-neon-purple' : 'text-gray-300'
                  }`}>
                    {winner === 'performer1' 
                      ? performerBoxes[0].username 
                      : winner === 'performer2' 
                      ? performerBoxes[1].username 
                      : 'Both Performers!'}
                  </h3>
                  
                  {/* Score Breakdown */}
                  <div className="bg-black/40 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-400 mb-1">Gift Points</p>
                    <p className="text-xl font-bold text-neon-gold">
                      {winner === 'performer1' 
                        ? performerBoxes[0].gifts 
                        : winner === 'performer2' 
                        ? performerBoxes[1].gifts 
                        : '-'}
                    </p>
                  </div>
                  
                  <div className="bg-black/40 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-400 mb-1">Judge Votes</p>
                    <p className="text-xl font-bold text-green-400">
                      {winner === 'performer1' 
                        ? performerBoxes[0].judgeVotes 
                        : winner === 'performer2' 
                        ? performerBoxes[1].judgeVotes 
                        : `${performerBoxes[0].judgeVotes} - ${performerBoxes[1].judgeVotes}`}
                    </p>
                  </div>
                  
                  <div className="bg-black/40 rounded-lg p-3">
                    <p className="text-sm text-gray-400 mb-1">Total Score</p>
                    <p className="text-3xl font-black text-white">
                      {winner === 'performer1' 
                        ? performerBoxes[0].gifts + (performerBoxes[0].judgeVotes * 100)
                        : winner === 'performer2' 
                        ? performerBoxes[1].gifts + (performerBoxes[1].judgeVotes * 100)
                        : 'TIE!'}
                    </p>
                  </div>
                  
                  {/* Close Winner Display */}
                  <button
                    onClick={() => {
                      // Go back to pre-show state
                      endShow()
                    }}
                    className="mt-4 px-6 py-2 bg-neon-gold hover:bg-neon-yellow text-black font-bold rounded-full"
                  >
                    End Show
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Judge Voting Panel - overlay that slides in from right */}
      {isJudgePanelOpen && (currentUserRole === 'judge' || isCeo) && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-900/95 border-l border-neon-purple z-50 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-neon-purple">Judge Voting Panel</h3>
            <button onClick={() => setIsJudgePanelOpen(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          
          {/* Camera and Leave Controls */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleToggleVideo}
              className="flex-1 btn-neon-red py-2 rounded-lg font-bold text-sm"
            >
              {isVideoOff ? '📹 Camera On' : '📷 Camera Off'}
            </button>
            <button
              onClick={handleLeave}
              className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-bold text-sm"
            >
              Leave
            </button>
          </div>
          
          <p className="text-gray-400 text-sm mb-4">Vote for the performer you want to advance!</p>
          
          {/* Performer 1 Voting */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <img src={performerBoxes[0].avatar || 'https://i.pravatar.cc/50'} alt={performerBoxes[0].username} className="w-10 h-10 rounded-full" />
              <span className="font-bold text-white">{performerBoxes[0].username}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleJudgeVote(0, 'yes')} className="flex-1 btn-neon-green py-2 rounded-lg font-bold">✓ YES</button>
              <button onClick={() => handleJudgeVote(0, 'no')} className="flex-1 btn-neon-red py-2 rounded-lg font-bold">✕ NO</button>
            </div>
          </div>
          
          {/* Performer 2 Voting */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <img src={performerBoxes[1].avatar || 'https://i.pravatar.cc/50'} alt={performerBoxes[1].username} className="w-10 h-10 rounded-full" />
              <span className="font-bold text-white">{performerBoxes[1].username}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleJudgeVote(1, 'yes')} className="flex-1 btn-neon-green py-2 rounded-lg font-bold">✓ YES</button>
              <button onClick={() => handleJudgeVote(1, 'no')} className="flex-1 btn-neon-red py-2 rounded-lg font-bold">✕ NO</button>
            </div>
          </div>
          
          {/* Current Votes Display */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-bold text-gray-300 mb-2">Current Scores</h4>
            <div className="flex justify-between text-sm">
              <span className="text-neon-green">{performerBoxes[0].username}: {performerBoxes[0].judgeVotes} votes</span>
              <span className="text-neon-purple">{performerBoxes[1].username}: {performerBoxes[1].judgeVotes} votes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


