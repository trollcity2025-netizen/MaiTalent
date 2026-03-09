import { create } from 'zustand'
import type { User, Show, Performance, ChatMessage } from '../lib/supabase'

interface AppState {
  // User state
  user: User | null
  setUser: (user: User | null) => void
  
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
