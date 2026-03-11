// OneSignal Notification Service
// For react-onesignal v3

// OneSignal App ID - should be set in environment variables
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || ''

// Initialize OneSignal - call this when app starts
export const initOneSignal = async (): Promise<void> => {
  if (!ONESIGNAL_APP_ID) {
    console.warn('OneSignal App ID not configured. Notifications disabled.')
    return
  }

  try {
    // Dynamic import to avoid issues when OneSignal is not configured
    const OneSignal = await import('react-onesignal')
    
    await OneSignal.default.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    })
    
    console.log('OneSignal initialized successfully')
  } catch (error) {
    console.error('Failed to initialize OneSignal:', error)
  }
}

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!ONESIGNAL_APP_ID) return false
  
  try {
    const OneSignal = await import('react-onesignal')
    
    // Check current permission
    const isEnabled = await OneSignal.default.Notifications.permission
    if (isEnabled) {
      return true
    }
    
    // Request permission
    const result = await OneSignal.default.Notifications.requestPermission()
    return result
  } catch (error) {
    console.error('Failed to request notification permission:', error)
    return false
  }
}

// Send internal notification (for logged-in users)
export const sendInternalNotification = async (
  userId: string,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<boolean> => {
  // This would typically call a Supabase Edge Function
  // that uses OneSignal REST API to send notifications
  // For now, we log it
  console.log('Internal notification:', { userId, title, message, data })
  return true
}

// Notification types
export type NotificationType = 
  | 'show_starting'
  | 'judge_application'
  | 'host_application'
  | 'coin_purchase'
  | 'show_ending'
  | 'message_received'
  | 'support_ticket'

// Get notification title and message based on type
export const getNotificationContent = (
  type: NotificationType,
  data: Record<string, unknown>
): { title: string; message: string } => {
  switch (type) {
    case 'show_starting':
      return {
        title: '🎭 Show Starting Soon!',
        message: `The show "${data.showTitle || 'Live Show'}" starts in 30 minutes!`,
      }
    case 'judge_application':
      return {
        title: '📋 New Judge Application',
        message: `${data.applicantName || 'Someone'} applied to be a judge.`,
      }
    case 'host_application':
      return {
        title: '🎤 New Host Application',
        message: `${data.applicantName || 'Someone'} applied to be a host.`,
      }
    case 'coin_purchase':
      return {
        title: '💰 Coin Purchase',
        message: `${data.username || 'A user'} purchased ${data.coins || 0} coins!`,
      }
    case 'show_ending':
      return {
        title: '👋 Show Ended',
        message: `The show "${data.showTitle || 'Live Show'}" has ended.`,
      }
    case 'message_received':
      return {
        title: '💬 New Message',
        message: `You have a new message from ${data.senderName || 'someone'}.`,
      }
    case 'support_ticket':
      return {
        title: '🎫 New Support Ticket',
        message: `${data.username || 'A user'} submitted a support ticket: ${data.subject || ''}`,
      }
    default:
      return {
        title: 'MaiTalent Notification',
        message: 'You have a new notification.',
      }
  }
}

// Store notification subscription in database
export const saveNotificationSubscription = async (
  userId: string,
  playerId: string
): Promise<boolean> => {
  try {
    const { supabase } = await import('../lib/supabase')
    
    const { error } = await supabase
      .from('user_notifications')
      .upsert({
        user_id: userId,
        onesignal_player_id: playerId,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Failed to save notification subscription:', error)
    return false
  }
}

// Get CEO's player IDs from database for direct notifications
export const getCeoPlayerIds = async (): Promise<string[]> => {
  try {
    const { supabase } = await import('../lib/supabase')
    
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('is_ceo', true)
    
    if (error) throw error
    
    if (!data || data.length === 0) return []
    
    const ceoIds = data.map(u => u.id)
    
    // Get their OneSignal player IDs
    const { data: playerData, error: playerError } = await supabase
      .from('user_notifications')
      .select('onesignal_player_id')
      .in('user_id', ceoIds)
      .not('onesignal_player_id', 'is', null)
    
    if (playerError) throw playerError
    
    return (playerData || [])
      .map(p => p.onesignal_player_id)
      .filter(Boolean) as string[]
  } catch (error) {
    console.error('Failed to get CEO player IDs:', error)
    return []
  }
}

// Trigger a notification for CEO (called from various places in the app)
export const notifyCeo = async (
  type: NotificationType,
  data: Record<string, unknown>
): Promise<boolean> => {
  const { title, message } = getNotificationContent(type, data)
  
  // Log for now - actual OneSignal push would require server-side API call
  console.log('📱 CEO Notification:', { type, title, message, data })
  
  // In production, this would call a Supabase Edge Function
  // that sends the notification via OneSignal REST API
  return true
}
