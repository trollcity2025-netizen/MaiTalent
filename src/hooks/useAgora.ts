import { useState, useEffect, useRef, useCallback } from 'react'
import AgoraRTC from 'agora-rtc-sdk-ng'
import type {
  ILocalVideoTrack,
  ILocalAudioTrack,
  ICameraVideoTrack,
  IMicrophoneAudioTrack
} from 'agora-rtc-sdk-ng'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AgoraTrack = any

// Agora configuration
const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '96360db28886429a891d823347bdfa43'

export interface AgoraUser {
  uid: string | number
  username: string
  hasVideo: boolean
  hasAudio: boolean
}

export interface UseAgoraOptions {
  channelName: string
  role: 'host' | 'judge' | 'performer' | 'ceo'
  userId: string
}

export interface UseAgoraReturn {
  // Remote users
  remoteUsers: Map<string, AgoraUser>
  
  // Connection state
  isJoined: boolean
  isPublishing: boolean
  
  // Local tracks for rendering
  localVideoTrack: AgoraTrack
  localAudioTrack: AgoraTrack
  
  // Controls
  join: () => Promise<void>
  leave: () => Promise<void>
  muteAudio: () => void
  unmuteAudio: () => void
  muteVideo: () => void
  unmuteVideo: () => void
  
  // Mute states
  isMutedAudio: boolean
  isMutedVideo: boolean
  
  // Screen share
  isScreenSharing: boolean
  startScreenShare: () => Promise<void>
  stopScreenShare: () => Promise<void>
  
  // Error handling
  error: string | null
}

export function useAgora(options: UseAgoraOptions): UseAgoraReturn {
  const { channelName, role, userId } = options
  
  const clientRef = useRef<AgoraTrack>(null)
  const localVideoRef = useRef<AgoraTrack>(null)
  const localAudioRef = useRef<AgoraTrack>(null)
  const screenShareRef = useRef<AgoraTrack>(null)
  const isJoinedRef = useRef(false)
  const isScreenSharingRef = useRef(false)
  
  const [remoteUsers, setRemoteUsers] = useState<Map<string, AgoraUser>>(new Map())
  const [isJoined, setIsJoined] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null)
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMutedAudio, setIsMutedAudio] = useState(false)
  const [isMutedVideo, setIsMutedVideo] = useState(false)

  // Generate token (simplified - in production, this should come from backend)
  const generateToken = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/agora-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName,
          uid: userId,
          role: 'publisher'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.token
      }
    } catch (err) {
      console.log('Token fetch failed, using empty token (dev mode):', err)
    }
    
    return ''
  }, [channelName, userId])

  // Stop screen share
  const stopScreenShare = useCallback(async () => {
    if (!clientRef.current || !localVideoRef.current) return
    
    try {
      if (screenShareRef.current) {
        screenShareRef.current.stop()
        screenShareRef.current.close()
        screenShareRef.current = null
      }
      
      await clientRef.current.unpublish()
      const tracks = [localVideoRef.current, localAudioRef.current].filter(Boolean)
      await clientRef.current.publish(tracks)
      
      isScreenSharingRef.current = false
      setIsScreenSharing(false)
    } catch (err) {
      console.error('Error stopping screen share:', err)
    }
  }, [])

  // Join channel
  const join = useCallback(async () => {
    if (!clientRef.current) return
    
    try {
      setError(null)
      
      // Create local tracks - createMicrophoneAndCameraTracks returns [audioTrack, videoTrack]
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks()
      
      // Assign correctly: videoTrack for video, audioTrack for audio
      const camTrack = videoTrack as ICameraVideoTrack
      const micTrack = audioTrack as IMicrophoneAudioTrack
      
      localVideoRef.current = camTrack
      localAudioRef.current = micTrack
      
      // Update state for rendering
      setLocalVideoTrack(camTrack)
      setLocalAudioTrack(micTrack)
      
      // Get token
      const token = await generateToken()
      
      // Join channel
      await clientRef.current.join(
        APP_ID,
        channelName,
        token || null,
        userId
      )
      
      // Publish local tracks
      const tracks = [videoTrack, audioTrack].filter(Boolean)
      await clientRef.current.publish(tracks as any)
      
      isJoinedRef.current = true
      setIsJoined(true)
      setIsPublishing(true)
      
    } catch (err) {
      console.error('Error joining channel:', err)
      setError(err instanceof Error ? err.message : 'Failed to join channel')
    }
  }, [channelName, userId, generateToken])

  // Leave channel
  const leave = useCallback(async () => {
    if (!clientRef.current) return
    
    try {
      if (localVideoRef.current) {
        localVideoRef.current.stop()
        localVideoRef.current.close()
        localVideoRef.current = null
      }
      
      if (localAudioRef.current) {
        localAudioRef.current.stop()
        localAudioRef.current.close()
        localAudioRef.current = null
      }
      
      if (screenShareRef.current) {
        screenShareRef.current.stop()
        screenShareRef.current.close()
        screenShareRef.current = null
      }
      
      await clientRef.current.leave()
      
      isJoinedRef.current = false
      isScreenSharingRef.current = false
      setIsJoined(false)
      setIsPublishing(false)
      setRemoteUsers(new Map())
      setIsScreenSharing(false)
      setLocalVideoTrack(null)
      setLocalAudioTrack(null)
      
    } catch (err) {
      console.error('Error leaving channel:', err)
    }
  }, [])

  // Mute/unmute audio
  const muteAudio = useCallback(() => {
    if (localAudioRef.current) {
      localAudioRef.current.setEnabled(false)
      setIsMutedAudio(true)
    }
  }, [])
  
  const unmuteAudio = useCallback(() => {
    if (localAudioRef.current) {
      localAudioRef.current.setEnabled(true)
      setIsMutedAudio(false)
    }
  }, [])

  // Mute/unmute video
  const muteVideo = useCallback(() => {
    if (localVideoRef.current) {
      localVideoRef.current.setEnabled(false)
      setIsMutedVideo(true)
    }
  }, [])
  
  const unmuteVideo = useCallback(() => {
    if (localVideoRef.current) {
      localVideoRef.current.setEnabled(true)
      setIsMutedVideo(false)
    }
  }, [])

  // Screen share
  const startScreenShare = useCallback(async () => {
    if (!clientRef.current || !localVideoRef.current) return
    
    try {
      // Stop camera video first
      localVideoRef.current.stop()
      
      // Create screen share track
      const screenTrackResult = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: {
          width: 1920,
          height: 1080,
          frameRate: 15,
          bitrateMin: 1000,
          bitrateMax: 2000
        }
      })
      
      const track = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult
      
      // Unpublish camera
      await clientRef.current.unpublish([localVideoRef.current])
      
      // Publish screen share
      const tracks = [track, localAudioRef.current].filter(Boolean)
      await clientRef.current.publish(tracks)
      
      screenShareRef.current = track
      isScreenSharingRef.current = true
      setIsScreenSharing(true)
      
      // Handle track ended
      track.on('track-ended', () => {
        stopScreenShare()
      })
      
    } catch (err) {
      console.error('Error starting screen share:', err)
      // Re-enable camera on error
      if (localVideoRef.current) {
        await localVideoRef.current.setEnabled(true)
      }
    }
  }, [stopScreenShare])

  // Initialize Agora client
  useEffect(() => {
    const client = AgoraRTC.createClient({
      mode: 'live',
      codec: 'vp8'
    })
    
    clientRef.current = client
    
    if (role === 'host' || role === 'judge' || role === 'performer') {
      client.setClientRole('host')
    }
    
    // Handle remote user joined
    client.on('user-published', async (user: AgoraTrack, mediaType: 'video' | 'audio') => {
      try {
        await client.subscribe(user, mediaType)
        
        const userKey = String(user.uid)
        
        setRemoteUsers(prev => {
          const updated = new Map(prev)
          const existingUser = updated.get(userKey) || {
            uid: user.uid,
            username: String(user.uid),
            hasVideo: false,
            hasAudio: false
          }
          
          if (mediaType === 'video') {
            existingUser.hasVideo = true
          }
          if (mediaType === 'audio') {
            existingUser.hasAudio = true
            if (user.audioTrack) {
              user.audioTrack.play()
            }
          }
          
          updated.set(userKey, existingUser)
          return updated
        })
      } catch (err) {
        console.error('Error subscribing to user:', err)
      }
    })
    
    // Handle remote user unpublished
    client.on('user-unpublished', (user: AgoraTrack, mediaType: 'video' | 'audio') => {
      const userKey = String(user.uid)
      
      setRemoteUsers(prev => {
        const updated = new Map(prev)
        const existingUser = updated.get(userKey)
        
        if (existingUser) {
          if (mediaType === 'video') {
            existingUser.hasVideo = false
          }
          if (mediaType === 'audio') {
            existingUser.hasAudio = false
          }
        }
        
        return updated
      })
    })
    
    // Handle remote user left
    client.on('user-left', (user: AgoraTrack) => {
      const userKey = String(user.uid)
      setRemoteUsers(prev => {
        const updated = new Map(prev)
        updated.delete(userKey)
        return updated
      })
    })
    
    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.close()
      }
      if (localAudioRef.current) {
        localAudioRef.current.close()
      }
      client.leave()
    }
  }, [role])

  return {
    remoteUsers,
    isJoined,
    isPublishing,
    localVideoTrack,
    localAudioTrack,
    join,
    leave,
    muteAudio,
    unmuteAudio,
    muteVideo,
    unmuteVideo,
    isMutedAudio,
    isMutedVideo,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    error
  }
}
