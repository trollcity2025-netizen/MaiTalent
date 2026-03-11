import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Badge } from '../components/Badge';
import type { BadgeType } from '../components/Badge';
import { VideoPlayer } from '../components/VideoPlayer';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { PayoutAllModal } from '../components/PayoutAllModal';
import { Globe, MessageSquare, Play, X } from 'lucide-react';

type TabType = 'judge_applications' | 'host_applications' | 'performer_applications' | 'users' | 'settings' | 'badges' | 'payouts' | 'ip_ban' | 'support_tickets';

interface JudgeApplication {
  id: string;
  user_id: string;
  full_name: string;
  experience: string;
  qualifications: string;
  availability: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  user?: {
    username: string;
    email: string;
    avatar: string;
  };
}

interface HostApplication {
  id: string;
  user_id: string;
  full_name: string;
  experience: string;
  channel_name: string;
  subscriber_count: number;
  content_links: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  user?: {
    username: string;
    email: string;
    avatar: string;
  };
}

interface PerformerApplication {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string;
  email: string;
  phone: string | null;
  talent_category: string;
  bio: string | null;
  video_url: string | null;
  availability: string | null;
  paypal_email: string;
  paypal_verified: boolean;
  status: 'pending' | 'approved' | 'denied' | 'bypassed';
  denial_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  attempts_count: number;
  bypassed_by: string | null;
  bypassed_at: string | null;
  created_at: string;
  user?: {
    username: string;
    email: string;
    avatar: string;
  };
}

interface UserRecord {
  id: string;
  username: string;
  email: string;
  avatar: string;
  is_admin: boolean;
  is_ceo: boolean;
  is_host: boolean;
  coin_balance: number;
  created_at: string;
  badges?: { badge_type: BadgeType }[];
}

interface PlatformSettings {
  chat_enabled: boolean;
  payouts_enabled: boolean;
  gifts_enabled: boolean;
  purchases_enabled: boolean;
  new_registrations_enabled: boolean;
}

interface BannedIP {
  id: string;
  ip_address: string;
  ip_network: string | null;
  reason: string | null;
  banned_by: string | null;
  banned_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('judge_applications');
  const [judgeApplications, setJudgeApplications] = useState<JudgeApplication[]>([]);
  const [hostApplications, setHostApplications] = useState<HostApplication[]>([]);
  const [performerApplications, setPerformerApplications] = useState<PerformerApplication[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    chat_enabled: true,
    payouts_enabled: true,
    gifts_enabled: true,
    purchases_enabled: true,
    new_registrations_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showPayoutAllModal, setShowPayoutAllModal] = useState(false);
  const [isCEO, setIsCEO] = useState(false);
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
  const [newBanIP, setNewBanIP] = useState('');
  const [newBanNetwork, setNewBanNetwork] = useState('');
  const [newBanReason, setNewBanReason] = useState('');
  const [newBanExpiry, setNewBanExpiry] = useState('');
  const [banningUser, setBanningUser] = useState(false);
  const [selectedBanUser, setSelectedBanUser] = useState<string>('');
  
  // Video modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>('');
  const [selectedPerformer, setSelectedPerformer] = useState<PerformerApplication | null>(null);
  
  // Show queue state
  const [availableShows, setAvailableShows] = useState<Array<{id: string, title: string}>>([]);
  const [selectedShowId, setSelectedShowId] = useState<string>('');
  const [addingToQueue, setAddingToQueue] = useState(false);
  
  // Support tickets state
  const [supportTickets, setSupportTickets] = useState<Array<{
    id: string;
    user_id: string;
    username: string;
    subject: string;
    message: string;
    status: string;
    priority: string;
    created_at: string;
    updated_at: string;
  }>>([]);

  const checkAuthorization = useCallback(async () => {
    if (!user) {
      setCheckingAuth(false);
      return;
    }

    try {
      // Check if user is CEO or has judge badge
      const { data: badges } = await supabase
        .from('user_badges')
        .select('badge_type')
        .eq('user_id', user.id);

      const isCEO = user.is_ceo || user.is_admin;
      const isJudge = badges?.some((b: { badge_type: string }) => b.badge_type === 'judge');

      setIsCEO(isCEO || false);
      setIsAuthorized(isCEO || !!isJudge);
    } catch (err) {
      console.error('Error checking authorization:', err);
      setIsAuthorized(false);
    } finally {
      setCheckingAuth(false);
    }
  }, [user]);

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
    setSelectedUser(null);
  };

  // Fetch fresh user data from database when managing a user
  const handleManageUser = async (user: UserRecord) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`*, badges:user_badges(badge_type)`)
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setSelectedUser(data);
    } catch (err) {
      console.error('Error fetching user data:', err);
      // Fallback to cached data if fetch fails
      setSelectedUser(user);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'judge_applications') {
        // Query judge applications and users separately to avoid relationship ambiguity
        const { data: applications, error: appError } = await supabase
          .from('judge_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (appError) throw appError;

        // Get unique user IDs
        const userIds = [...new Set(applications?.map(a => a.user_id).filter(Boolean) || [])];

        // Fetch user data for these IDs
        const { data: userData } = await supabase
          .from('users')
          .select('id, username, email, avatar')
          .in('id', userIds);

        // Join the data
        const userMap = new Map(userData?.map(u => [u.id, u]) || []);
        const mergedData = applications?.map(app => ({
          ...app,
          user: userMap.get(app.user_id)
        })) || [];

        setJudgeApplications(mergedData);
      } else if (activeTab === 'host_applications') {
        // Query host applications
        const { data: hostApps, error: hostError } = await supabase
          .from('host_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (hostError) throw hostError;

        // Get unique user IDs
        const hostUserIds = [...new Set(hostApps?.map(a => a.user_id).filter(Boolean) || [])];

        // Fetch user data for these IDs
        const { data: hostUserData } = await supabase
          .from('users')
          .select('id, username, email, avatar')
          .in('id', hostUserIds);

        // Join the data
        const hostUserMap = new Map(hostUserData?.map(u => [u.id, u]) || []);
        const mergedHostData = hostApps?.map(app => ({
          ...app,
          user: hostUserMap.get(app.user_id)
        })) || [];

        setHostApplications(mergedHostData);
      } else if (activeTab === 'performer_applications') {
        // Query performer applications
        const { data: perfApps, error: perfError } = await supabase
          .from('performer_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (perfError) throw perfError;

        // Get unique user IDs
        const perfUserIds = [...new Set(perfApps?.map(a => a.user_id).filter(Boolean) || [])];

        // Fetch user data for these IDs
        const { data: perfUserData } = await supabase
          .from('users')
          .select('id, username, email, avatar')
          .in('id', perfUserIds);

        // Join the data
        const perfUserMap = new Map(perfUserData?.map(u => [u.id, u]) || []);
        const mergedPerfData = perfApps?.map(app => ({
          ...app,
          user: perfUserMap.get(app.user_id)
        })) || [];

        setPerformerApplications(mergedPerfData);
      } else if (activeTab === 'users') {
        try {
          // First try to get all users
          const { data: allUsers, error: usersError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

          if (usersError) {
            console.error('Error fetching users:', usersError);
            // Try a simpler query without filters
            const { data: simpleUsers, error: simpleError } = await supabase
              .from('users')
              .select('id, username, email, avatar, is_ceo, is_admin, is_host, coin_balance, created_at');
            
            if (simpleError) {
              console.error('Error in simple query:', simpleError);
              throw simpleError;
            }
            setUsers(simpleUsers || []);
          } else {
            // Try to get badges separately
            const userIds = allUsers?.map(u => u.id) || [];
            const { data: allBadges } = await supabase
              .from('user_badges')
              .select('user_id, badge_type')
              .in('user_id', userIds);

            const badgeMap = new Map();
            allBadges?.forEach(b => {
              if (!badgeMap.has(b.user_id)) {
                badgeMap.set(b.user_id, []);
              }
              badgeMap.get(b.user_id).push({ badge_type: b.badge_type });
            });

            const usersWithBadges = allUsers?.map(u => ({
              ...u,
              badges: badgeMap.get(u.id) || []
            })) || [];

            setUsers(usersWithBadges);
          }
        } catch (err) {
          console.error('Error in users tab:', err);
          setUsers([]);
        }
      } else if (activeTab === 'settings') {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('*');

        if (error) throw error;
        
        const settingsObj: PlatformSettings = {
          chat_enabled: true,
          payouts_enabled: true,
          gifts_enabled: true,
          purchases_enabled: true,
          new_registrations_enabled: true,
        };
        
        (data || []).forEach((s: Record<string, string>) => {
          if (s.key in settingsObj) {
            (settingsObj as unknown as Record<string, boolean>)[s.key] = s.value === 'true';
          }
        });
        
        setSettings(settingsObj);
      } else if (activeTab === 'ip_ban' && isCEO) {
        const { data, error } = await supabase
          .from('banned_ips')
          .select('*')
          .order('banned_at', { ascending: false });

        if (error) throw error;
        setBannedIPs(data || []);
      } else if (activeTab === 'support_tickets' && isCEO) {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSupportTickets(data || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isCEO]);

  useEffect(() => {
    checkAuthorization();
  }, [checkAuthorization]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized, loadData]);

  const handleJudgeApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    try {
      // Update application status
      const { error } = await supabase
        .from('judge_applications')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          notes: reviewNotes,
        })
        .eq('id', applicationId);

      if (error) throw error;

      // If approved, add judge badge to user
      if (status === 'approved') {
        const application = judgeApplications.find(a => a.id === applicationId);
        if (application) {
          await supabase
            .from('user_badges')
            .insert({
              user_id: application.user_id,
              badge_type: 'judge',
            });
        }
      }

      // Reload data
      loadData();
      setReviewNotes('');
    } catch (err) {
      console.error('Error handling application:', err);
    }
  };

  const handleHostApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    try {
      // Update application status
      const { error } = await supabase
        .from('host_applications')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          notes: reviewNotes,
        })
        .eq('id', applicationId);

      if (error) throw error;

      // If approved, add host badge to user
      if (status === 'approved') {
        const application = hostApplications.find(a => a.id === applicationId);
        if (application) {
          await supabase
            .from('user_badges')
            .insert({
              user_id: application.user_id,
              badge_type: 'host',
            });
        }
      }

      // Reload data
      loadData();
      setReviewNotes('');
    } catch (err) {
      console.error('Error handling host application:', err);
    }
  };

  const handlePerformerApplication = async (
    applicationId: string,
    status: 'approved' | 'denied' | 'bypassed',
    denialReason?: string
  ) => {
    try {
      const updateData: Record<string, unknown> = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      };

      if (status === 'denied') {
        updateData.denial_reason = denialReason || reviewNotes;
      }

      if (status === 'bypassed' && user?.is_ceo) {
        updateData.bypassed_by = user.id;
        updateData.bypassed_at = new Date().toISOString();
        updateData.status = 'approved';
      }

      const { error } = await supabase
        .from('performer_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (error) throw error;

      // If approved or bypassed, add performer badge to user
      if (status === 'approved' || status === 'bypassed') {
        const application = performerApplications.find(a => a.id === applicationId);
        if (application) {
          await supabase
            .from('user_badges')
            .upsert({
              user_id: application.user_id,
              badge_type: 'performer',
            }, {
              onConflict: 'user_id,badge_type'
            });
        }
      }

      // Reload data
      loadData();
      setReviewNotes('');
    } catch (err) {
      console.error('Error handling performer application:', err);
    }
  };

  const handleSettingChange = async (key: string, value: boolean) => {
    try {
      await supabase
        .from('platform_settings')
        .upsert({
          key,
          value: value.toString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key',
        });

      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error('Error updating setting:', err);
    }
  };

  const handleBanIP = async () => {
    if (!newBanIP.trim()) return;
    
    setBanningUser(true);
    try {
      const banData: Record<string, unknown> = {
        ip_address: newBanIP.trim(),
        reason: newBanReason.trim() || null,
        banned_by: user?.id,
        is_active: true,
      };

      // Add network if provided (CIDR format)
      if (newBanNetwork.trim()) {
        banData.ip_network = newBanNetwork.trim();
      }

      // Add expiry if provided
      if (newBanExpiry) {
        banData.expires_at = new Date(newBanExpiry).toISOString();
      }

      const { error } = await supabase
        .from('banned_ips')
        .insert(banData);

      if (error) throw error;

      // Clear form
      setNewBanIP('');
      setNewBanNetwork('');
      setNewBanReason('');
      setNewBanExpiry('');
      setSelectedBanUser('');

      // Reload banned IPs
      loadData();
    } catch (err) {
      console.error('Error banning IP:', err);
      alert('Failed to ban IP. Make sure the table exists.');
    } finally {
      setBanningUser(false);
    }
  };

  const handleUnbanIP = async (banId: string) => {
    try {
      const { error } = await supabase
        .from('banned_ips')
        .update({ is_active: false })
        .eq('id', banId);

      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error unbanning IP:', err);
    }
  };

  // Fetch available shows for queue
  const fetchAvailableShows = async () => {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select('id, title')
        .in('status', ['scheduled', 'live'])
        .order('title');

      if (error) throw error;
      setAvailableShows(data || []);
    } catch (err) {
      console.error('Error fetching shows:', err);
    }
  };

  // Add approved performer to show queue
  const handleAddToQueue = async (applicationId: string) => {
    if (!selectedShowId || !selectedPerformer) return;

    setAddingToQueue(true);
    try {
      // Get the next position in queue
      const { data: existingQueue } = await supabase
        .from('show_queue')
        .select('position')
        .eq('show_id', selectedShowId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition = existingQueue ? existingQueue.position + 1 : 1;

      // Add to queue with performer_application_id
      const { error: queueError } = await supabase
        .from('show_queue')
        .insert({
          show_id: selectedShowId,
          user_id: selectedPerformer.user_id,
          position: nextPosition,
          status: 'waiting',
          performer_application_id: applicationId,
        });

      if (queueError) throw queueError;

      // Reset state
      setSelectedShowId('');
      setSelectedPerformer(null);
      setShowVideoModal(false);

      alert('Performer added to queue successfully!');
      loadData();
    } catch (err) {
      console.error('Error adding to queue:', err);
      alert('Failed to add to queue. Please try again.');
    } finally {
      setAddingToQueue(false);
    }
  };

  // Open video modal for a performer
  const openVideoModal = (performer: PerformerApplication) => {
    if (performer.video_url) {
      setSelectedVideoUrl(performer.video_url);
      setSelectedPerformer(performer);
      setShowVideoModal(true);
      fetchAvailableShows();
    }
  };

  const addBadgeToUser = async (userId: string, badgeType: BadgeType) => {
    try {
      await supabase
        .from('user_badges')
        .upsert({
          user_id: userId,
          badge_type: badgeType,
        }, {
          onConflict: 'user_id,badge_type',
        });

      loadData();
    } catch (err) {
      console.error('Error adding badge:', err);
    }
  };

  const tabs = [
    { id: 'judge_applications' as TabType, label: 'Judge Apps', icon: '📋' },
    { id: 'host_applications' as TabType, label: 'Host Apps', icon: '🎤' },
    { id: 'performer_applications' as TabType, label: 'Performer Apps', icon: '⭐' },
    { id: 'users' as TabType, label: 'Users', icon: '👥' },
    { id: 'badges' as TabType, label: 'Badges', icon: '🏅' },
    { id: 'payouts' as TabType, label: 'Payouts', icon: '💰' },
    { id: 'settings' as TabType, label: 'Settings', icon: '⚙️' },
    ...(isCEO ? [{ id: 'ip_ban' as TabType, label: 'IP Ban', icon: '🚫' }] : []),
    ...(isCEO ? [{ id: 'support_tickets' as TabType, label: 'Support', icon: '🎫' }] : []),
  ];

  // Show loading while checking authorization
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <div className="animate-pulse text-neon-yellow">Checking authorization...</div>
        </div>
      </div>
    );
  }

  // Show access denied if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center h-64">
          <h2 className="text-2xl font-bold text-candy-red mb-4">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to access this page.</p>
          <p className="text-gray-500 text-sm mt-2">Only CEO and Judges can access the CEO Dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Badge type="ceo" size="lg" />
          <h1 className="text-3xl font-bold shimmer-gold">CEO Dashboard</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-800 rounded-lg"></div>
            <div className="h-20 bg-gray-800 rounded-lg"></div>
            <div className="h-20 bg-gray-800 rounded-lg"></div>
          </div>
        ) : (
          <>
            {/* Judge Applications Tab */}
            {activeTab === 'judge_applications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Judge Applications</h2>
                  <button
                    onClick={loadData}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    🔄 Fetch All
                  </button>
                </div>
                {judgeApplications.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No judge applications yet</p>
                ) : (
                  judgeApplications.map(app => (
                    <div
                      key={app.id}
                      className="bg-gray-900 border border-gray-700 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden">
                            {app.user?.avatar ? (
                              <img
                                src={app.user.avatar}
                                alt={app.user.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">👤</div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{app.full_name}</p>
                            <p className="text-sm text-gray-400">@{app.user?.username}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          app.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {app.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Experience</p>
                          <p className="text-sm">{app.experience}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Availability</p>
                          <p className="text-sm capitalize">{app.availability}</p>
                        </div>
                        {app.qualifications && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-400 mb-1">Qualifications</p>
                            <p className="text-sm">{app.qualifications}</p>
                          </div>
                        )}
                      </div>

                      {app.status === 'pending' && (
                        <div className="space-y-3">
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Add notes (optional)"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleJudgeApplication(app.id, 'approved')}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => handleJudgeApplication(app.id, 'rejected')}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Host Applications Tab */}
            {activeTab === 'host_applications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Host Applications</h2>
                  <button
                    onClick={loadData}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    🔄 Fetch All
                  </button>
                </div>
                {hostApplications.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No host applications yet</p>
                ) : (
                  hostApplications.map(app => (
                    <div
                      key={app.id}
                      className="bg-gray-900 border border-gray-700 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden">
                            {app.user?.avatar ? (
                              <img
                                src={app.user.avatar}
                                alt={app.user.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">🎤</div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{app.full_name}</p>
                            <p className="text-sm text-gray-400">@{app.user?.username}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          app.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {app.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Channel Name</p>
                          <p className="text-sm">{app.channel_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Subscribers</p>
                          <p className="text-sm">{app.subscriber_count?.toLocaleString()}</p>
                        </div>
                        {app.experience && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-400 mb-1">Experience</p>
                            <p className="text-sm">{app.experience}</p>
                          </div>
                        )}
                        {app.content_links && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-400 mb-1">Content Links</p>
                            <p className="text-sm">{app.content_links}</p>
                          </div>
                        )}
                      </div>

                      {app.status === 'pending' && (
                        <div className="space-y-3">
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Add notes (optional)"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleHostApplication(app.id, 'approved')}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => handleHostApplication(app.id, 'rejected')}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Performer Applications Tab */}
            {activeTab === 'performer_applications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Performer Applications</h2>
                  <button
                    onClick={loadData}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    🔄 Fetch All
                  </button>
                </div>
                {performerApplications.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No performer applications yet</p>
                ) : (
                  performerApplications.map(app => (
                    <div
                      key={app.id}
                      className="bg-gray-900 border border-gray-700 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden">
                            {app.user?.avatar ? (
                              <img
                                src={app.user.avatar}
                                alt={app.user.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">⭐</div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{app.full_name}</p>
                            <p className="text-sm text-gray-400">@{app.user?.username}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          app.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          app.status === 'bypassed' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {app.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Date of Birth</p>
                          <p className="text-sm">{app.date_of_birth ? new Date(app.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Email</p>
                          <p className="text-sm">{app.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Talent Category</p>
                          <p className="text-sm capitalize">{app.talent_category}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">PayPal Email</p>
                          <p className="text-sm">{app.paypal_email} {app.paypal_verified ? '✅' : '❌'}</p>
                        </div>
                        {app.bio && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-400 mb-1">Bio</p>
                            <p className="text-sm">{app.bio}</p>
                          </div>
                        )}
                        {app.video_url && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-400 mb-1">Video URL</p>
                            <div className="flex gap-2 items-center">
                              <a href={app.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">
                                {app.video_url}
                              </a>
                              <button
                                onClick={() => openVideoModal(app)}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-1"
                              >
                                <Play className="w-4 h-4" />
                                Watch
                              </button>
                            </div>
                          </div>
                        )}
                        {app.denial_reason && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-red-400 mb-1">Denial Reason</p>
                            <p className="text-sm text-gray-300">{app.denial_reason}</p>
                          </div>
                        )}
                        <div className="md:col-span-2 text-xs text-gray-500">
                          Attempts: {app.attempts_count} | Submitted: {new Date(app.created_at).toLocaleString()}
                        </div>
                      </div>

                      {app.status === 'pending' && (
                        <div className="space-y-3">
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Add denial reason (required if denying)"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handlePerformerApplication(app.id, 'approved')}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => {
                                if (!reviewNotes.trim()) {
                                  alert('Please provide a denial reason');
                                  return;
                                }
                                handlePerformerApplication(app.id, 'denied');
                              }}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium"
                            >
                              ❌ Deny
                            </button>
                            {isCEO && (
                              <button
                                onClick={() => handlePerformerApplication(app.id, 'bypassed')}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium"
                              >
                                👑 CEO Bypass
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">All Users</h2>
                  <button
                    onClick={loadData}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    🔄 Fetch All
                  </button>
                </div>
                <div className="grid gap-4">
                  {users.map(user => (
                    <div
                      key={user.id}
                      className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">👤</div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {user.username}
                            {user.is_ceo && <Badge type="ceo" size="sm" />}
                            {user.is_admin && <Badge type="moderator" size="sm" />}
                            {user.is_host && <Badge type="performer" size="sm" />}
                            {(user.badges || []).map((b: { badge_type: BadgeType }) => (
                              <Badge key={b.badge_type} type={b.badge_type} size="sm" showLabel={false} />
                            ))}
                          </p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Coins</p>
                          <p className="font-medium">{user.coin_balance?.toLocaleString() || 0}</p>
                        </div>
                        <button
                          onClick={() => handleManageUser(user)}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Badges Tab */}
            {activeTab === 'badges' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Manage Badges</h2>
                <div className="grid gap-4">
                  {users.map(user => (
                    <div
                      key={user.id}
                      className="bg-gray-900 border border-gray-700 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">👤</div>
                            )}
                          </div>
                          <p className="font-semibold">{user.username}</p>
                        </div>
                        <div className="flex gap-1">
                          {(user.badges || []).map((b: { badge_type: BadgeType }) => (
                            <Badge key={b.badge_type} type={b.badge_type} size="sm" showLabel={false} />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(['ceo', 'judge', 'host', 'auditioner', 'performer', 'winner', 'top_performer', 'moderator', 'vip'] as BadgeType[]).map(badge => (
                          <button
                            key={badge}
                            onClick={() => addBadgeToUser(user.id, badge)}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                          >
                            + {badge}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Platform Settings</h2>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Chat Enabled</p>
                      <p className="text-sm text-gray-400">Allow users to send messages in shows</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('chat_enabled', !settings.chat_enabled)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.chat_enabled ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.chat_enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Payouts Enabled</p>
                      <p className="text-sm text-gray-400">Allow creators to request payouts</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('payouts_enabled', !settings.payouts_enabled)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.payouts_enabled ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.payouts_enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Gifts Enabled</p>
                      <p className="text-sm text-gray-400">Allow users to send gifts</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('gifts_enabled', !settings.gifts_enabled)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.gifts_enabled ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.gifts_enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Coin Purchases Enabled</p>
                      <p className="text-sm text-gray-400">Allow users to purchase coins</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('purchases_enabled', !settings.purchases_enabled)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.purchases_enabled ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.purchases_enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Registrations Enabled</p>
                      <p className="text-sm text-gray-400">Allow new users to sign up</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('new_registrations_enabled', !settings.new_registrations_enabled)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.new_registrations_enabled ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.new_registrations_enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payouts Tab */}
            {activeTab === 'payouts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Bulk Payouts</h2>
                  <button
                    onClick={() => setShowPayoutAllModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    💰 Payout to All
                  </button>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
                  <p className="text-gray-400 mb-4">
                    Pay all eligible performers at once using PayPal Payouts API.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-4">
                      <p className="text-purple-400 text-sm">Minimum Payout</p>
                      <p className="text-2xl font-bold text-white">15,000 coins</p>
                      <p className="text-gray-400 text-sm">= $50 USD</p>
                    </div>
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                      <p className="text-blue-400 text-sm">Payout Schedule</p>
                      <p className="text-2xl font-bold text-white">Weekly</p>
                      <p className="text-gray-400 text-sm">Every Friday</p>
                    </div>
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                      <p className="text-green-400 text-sm">Payment Method</p>
                      <p className="text-2xl font-bold text-white">PayPal</p>
                      <p className="text-gray-400 text-sm">Instant transfer</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* IP Ban Tab */}
            {activeTab === 'ip_ban' && isCEO && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">🚫 IP Ban Management</h2>
                
                {/* Add New Ban Form */}
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-medium mb-4">Add New Ban</h3>
                  
                  {/* User Selection Dropdown */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-1">Select User to Ban (Optional)</label>
                    <select
                      value={selectedBanUser}
                      onChange={(e) => {
                        setSelectedBanUser(e.target.value);
                        // Note: IP address would need to be fetched from server logs
                        // For now, user can still enter IP manually or we show a note
                      }}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    >
                      <option value="">-- Select a user --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.username} ({u.email})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Note: Select a user, then enter their IP address manually or the system will attempt to fetch it.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">IP Address *</label>
                      <input
                        type="text"
                        value={newBanIP}
                        onChange={(e) => setNewBanIP(e.target.value)}
                        placeholder="192.168.1.100"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Network (CIDR)</label>
                      <input
                        type="text"
                        value={newBanNetwork}
                        onChange={(e) => setNewBanNetwork(e.target.value)}
                        placeholder="10.0.0.0/8"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Expires</label>
                      <input
                        type="datetime-local"
                        value={newBanExpiry}
                        onChange={(e) => setNewBanExpiry(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Reason</label>
                      <input
                        type="text"
                        value={newBanReason}
                        onChange={(e) => setNewBanReason(e.target.value)}
                        placeholder="Spam / Abusive behavior"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleBanIP}
                    disabled={banningUser || !newBanIP.trim()}
                    className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium"
                  >
                    {banningUser ? 'Banning...' : '🚫 Ban IP Address'}
                  </button>
                </div>

                {/* Banned IPs List */}
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-medium mb-4">Active Bans ({bannedIPs.filter(b => b.is_active).length})</h3>
                  {bannedIPs.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No banned IPs</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {bannedIPs.map((ban) => (
                        <div
                          key={ban.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            ban.is_active ? 'bg-red-500/10 border border-red-500/30' : 'bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                              <Globe className="w-4 h-4 text-red-400" />
                            </div>
                            <div>
                              <p className="font-mono font-medium">{ban.ip_address}</p>
                              {ban.ip_network && (
                                <p className="text-xs text-gray-400">Network: {ban.ip_network}</p>
                              )}
                              {ban.reason && (
                                <p className="text-sm text-gray-400">Reason: {ban.reason}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                Banned: {new Date(ban.banned_at).toLocaleDateString()}
                                {ban.expires_at && ` • Expires: ${new Date(ban.expires_at).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                          {ban.is_active && (
                            <button
                              onClick={() => handleUnbanIP(ban.id)}
                              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                            >
                              Unban
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ IP banning requires the database migration to be run first. 
                    Run the SQL from supabase/ip-ban-migration.sql in your Supabase SQL editor.
                  </p>
                </div>
              </div>
            )}

            {/* Support Tickets Tab */}
            {activeTab === 'support_tickets' && isCEO && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">🎫 Support Tickets</h2>
                
                {supportTickets.length === 0 ? (
                  <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">No support tickets yet</p>
                    <p className="text-gray-500 text-sm mt-2">Users can submit tickets from their profile Settings tab</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supportTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="bg-gray-900 border border-gray-700 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <span className="text-lg">🎫</span>
                            </div>
                            <div>
                              <p className="font-semibold text-white">{ticket.subject}</p>
                              <p className="text-sm text-gray-400">
                                From: <span className="text-neon-gold">{ticket.username}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              ticket.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                              ticket.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              ticket.priority === 'normal' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {ticket.priority}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              ticket.status === 'open' ? 'bg-green-500/20 text-green-400' :
                              ticket.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                              ticket.status === 'resolved' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                          <p className="text-gray-300 text-sm">{ticket.message}</p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            Created: {new Date(ticket.created_at).toLocaleString()}
                          </p>
                          <div className="flex gap-2">
                            {ticket.status === 'open' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await supabase
                                      .from('support_tickets')
                                      .update({ status: 'in_progress' })
                                      .eq('id', ticket.id);
                                    loadData();
                                  } catch (err) {
                                    console.error('Error updating ticket:', err);
                                  }
                                }}
                                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs font-medium"
                              >
                                Start Working
                              </button>
                            )}
                            {ticket.status === 'in_progress' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await supabase
                                      .from('support_tickets')
                                      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
                                      .eq('id', ticket.id);
                                    loadData();
                                  } catch (err) {
                                    console.error('Error updating ticket:', err);
                                  }
                                }}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium"
                              >
                                Mark Resolved
                              </button>
                            )}
                            {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                              <button
                                onClick={async () => {
                                  if (!confirm('Close this ticket without resolving?')) return;
                                  try {
                                    await supabase
                                      .from('support_tickets')
                                      .update({ status: 'closed' })
                                      .eq('id', ticket.id);
                                    loadData();
                                  } catch (err) {
                                    console.error('Error closing ticket:', err);
                                  }
                                }}
                                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs font-medium"
                              >
                                Close
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* User Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-white mb-4">
              Manage: {selectedUser.username}
            </h3>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => addBadgeToUser(selectedUser.id, 'judge')}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                >
                  ⭐ Add Judge
                </button>
                <button
                  onClick={() => addBadgeToUser(selectedUser.id, 'host')}
                  className="px-3 py-1 bg-pink-600 hover:bg-pink-700 rounded text-sm"
                >
                  🎤 Add Host
                </button>
                <button
                  onClick={() => addBadgeToUser(selectedUser.id, 'vip')}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-sm"
                >
                  💎 Add VIP
                </button>
                <button
                  onClick={() => addBadgeToUser(selectedUser.id, 'moderator')}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  🛡️ Add Mod
                </button>
              </div>

              <hr className="border-gray-700" />

              <button
                onClick={() => handleViewProfile(selectedUser.id)}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
              >
                👤 View Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout All Modal */}
      <PayoutAllModal 
        isOpen={showPayoutAllModal} 
        onClose={() => setShowPayoutAllModal(false)} 
      />

      {/* Video Modal */}
      {showVideoModal && selectedPerformer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowVideoModal(false)}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-xl font-bold text-white mb-4">
              Audition Video - {selectedPerformer.full_name}
            </h3>

            {/* Video Player */}
            <div className="mb-6">
              <VideoPlayer url={selectedVideoUrl} />
            </div>

            {/* Performer Info */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden">
                  {selectedPerformer.user?.avatar ? (
                    <img
                      src={selectedPerformer.user.avatar}
                      alt={selectedPerformer.user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">⭐</div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-white">{selectedPerformer.full_name}</p>
                  <p className="text-sm text-gray-400">@{selectedPerformer.user?.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-400">Talent</p>
                  <p className="text-white capitalize">{selectedPerformer.talent_category}</p>
                </div>
                <div>
                  <p className="text-gray-400">Bio</p>
                  <p className="text-white">{selectedPerformer.bio || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Add to Queue Section */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="font-semibold text-white mb-3">Add to Show Queue</h4>
              <div className="flex gap-2 mb-4">
                <select
                  value={selectedShowId}
                  onChange={(e) => setSelectedShowId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">Select a show...</option>
                  {availableShows.map(show => (
                    <option key={show.id} value={show.id}>{show.title}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleAddToQueue(selectedPerformer.id)}
                  disabled={!selectedShowId || addingToQueue}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium"
                >
                  {addingToQueue ? 'Adding...' : 'Add to Queue'}
                </button>
              </div>
              {availableShows.length === 0 && (
                <p className="text-sm text-yellow-400">
                  No scheduled or live shows available. Create a show first to add performers to queue.
                </p>
              )}
            </div>

            {/* Approve/Deny Section */}
            {selectedPerformer.status === 'pending' && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h4 className="font-semibold text-white mb-3">Review Application</h4>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes (required if denying)"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none mb-3"
                  rows={2}
                />
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      handlePerformerApplication(selectedPerformer.id, 'approved');
                      if (selectedShowId) {
                        handleAddToQueue(selectedPerformer.id);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => {
                      if (!reviewNotes.trim()) {
                        alert('Please provide a denial reason');
                        return;
                      }
                      handlePerformerApplication(selectedPerformer.id, 'denied');
                      setShowVideoModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium"
                  >
                    ❌ Deny
                  </button>
                  {isCEO && (
                    <button
                      onClick={() => {
                        handlePerformerApplication(selectedPerformer.id, 'bypassed');
                        setShowVideoModal(false);
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium"
                    >
                      👑 CEO Bypass
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
