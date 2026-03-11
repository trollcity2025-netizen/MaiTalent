import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { BadgeType } from '../components/Badge';

export const useUserBadges = (userId: string | undefined) => {
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setBadges([]);
      return;
    }

    const fetchBadges = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_badges')
          .select('badge_type')
          .eq('user_id', userId);

        if (error) throw error;
        
        if (data) {
          setBadges(data.map((d: { badge_type: string }) => d.badge_type as BadgeType));
        }
      } catch (err) {
        console.error('Error fetching badges:', err);
        setBadges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [userId]);

  return { badges, loading };
};

export default useUserBadges;
