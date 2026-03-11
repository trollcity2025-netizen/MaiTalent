import { create } from 'zustand'
import type { User, Show, Performance, ChatMessage } from '../lib/supabase'

interface AppState {
  // User state
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
  
  // Coin balance
  coins: number
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => void
  
  // PayPal state
  paypalEmail: string | null
  paypalVerified: boolean
  setPaypalInfo: (email: string | null, verified: boolean) => void
  
  // Store modal
  storeOpen: boolean
  setStoreOpen: (open: boolean) => void
  
  // Payout modal
  payoutOpen: boolean
  setPayoutOpen: (open: boolean) => void
  
  // PayPal modal
  paypalModalOpen: boolean
  setPaypalModalOpen: (open: boolean) => void
  
  // Sidebar state
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  
  // Current show state
  currentShow: Show | null
  setCurrentShow: (show: Show | null) => void
  
  // Live shows
  liveShows: Show[]
  setLiveShows: (shows: Show[]) => void
  
  // Current performance
  currentPerformance: Performance | null
  setCurrentPerformance: (performance: Performance | null) => void
  
  // Chat messages
  chatMessages: ChatMessage[]
  addChatMessage: (message: ChatMessage) => void
  removeChatMessage: (id: string) => void
  clearChatMessages: () => void
  
  // Viewer count
  viewerCount: number
  setViewerCount: (count: number) => void
  
  // Voting
  hasVoted: boolean
  setHasVoted: (voted: boolean) => void
  
  // Agora token
  agoraToken: string | null
  setAgoraToken: (token: string | null) => void
  
  // Mux playback ID
  muxPlaybackId: string | null
  setMuxPlaybackId: (id: string | null) => void
  
  // Notifications
  notifications: Notification[]
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export const useAppStore = create<AppState>((set) => ({
  // User state
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null, coins: 0 }),
  
  // Coin balance
  coins: 0,
  addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
  spendCoins: (amount) => set((state) => {
    if (state.coins >= amount) {
      return { coins: state.coins - amount }
    }
    return state
  }),
  
  // PayPal state
  paypalEmail: null,
  paypalVerified: false,
  setPaypalInfo: (email, verified) => set({ paypalEmail: email, paypalVerified: verified }),
  
  // Store modal
  storeOpen: false,
  setStoreOpen: (open) => set({ storeOpen: open }),
  
  // Payout modal
  payoutOpen: false,
  setPayoutOpen: (open) => set({ payoutOpen: open }),
  
  // PayPal modal
  paypalModalOpen: false,
  setPaypalModalOpen: (open) => set({ paypalModalOpen: open }),
  
  // Sidebar state
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  // Current show state
  currentShow: null,
  setCurrentShow: (show) => set({ currentShow: show }),
  
  // Live shows
  liveShows: [],
  setLiveShows: (shows) => set({ liveShows: shows }),
  
  // Current performance
  currentPerformance: null,
  setCurrentPerformance: (performance) => set({ currentPerformance: performance }),
  
  // Chat messages
  chatMessages: [],
  addChatMessage: (message) => set((state) => ({ 
    chatMessages: [...state.chatMessages.slice(-99), message] 
  })),
  removeChatMessage: (id) => set((state) => ({ 
    chatMessages: state.chatMessages.filter(m => m.id !== id) 
  })),
  clearChatMessages: () => set({ chatMessages: [] }),
  
  // Viewer count
  viewerCount: 0,
  setViewerCount: (count) => set({ viewerCount: count }),
  
  // Voting
  hasVoted: false,
  setHasVoted: (voted) => set({ hasVoted: voted }),
  
  // Agora token
  agoraToken: null,
  setAgoraToken: (token) => set({ agoraToken: token }),
  
  // Mux playback ID
  muxPlaybackId: null,
  setMuxPlaybackId: (id) => set({ muxPlaybackId: id }),
  
  // Notifications
  notifications: [],
  addNotification: (notification) => set((state) => ({ 
    notifications: [...state.notifications, notification] 
  })),
  removeNotification: (id) => set((state) => ({ 
    notifications: state.notifications.filter(n => n.id !== id) 
  })),
}))
