import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useAppStore } from '../store/useAppStore'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Check if IP is banned
export async function checkIPBan(ipAddress: string): Promise<{ banned: boolean; reason?: string }> {
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

export function MainLayout() {
  const { sidebarCollapsed, logout } = useAppStore()
  const navigate = useNavigate()
  const [banChecked, setBanChecked] = useState(false)

  // Check IP ban on every page load
  useEffect(() => {
    const checkBan = async () => {
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const banResult = await checkIPBan(ipData.ip);
        
        if (banResult.banned) {
          // Log out and redirect to auth with ban message
          await supabase.auth.signOut();
          logout();
          navigate('/auth?banned=true&reason=' + encodeURIComponent(banResult.reason || 'IP banned'));
        }
      } catch (err) {
        console.warn('Could not check IP ban:', err);
      } finally {
        setBanChecked(true);
      }
    }

    if (!banChecked) {
      checkBan();
    }
  }, [navigate, logout, banChecked]);

  return (
    <div className="min-h-screen spotlight-gradient flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={`flex-1 transition-all duration-300 overflow-x-hidden pt-16 ${
            sidebarCollapsed ? 'ml-16' : 'ml-64'
          }`}
        >
          <div className="h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
