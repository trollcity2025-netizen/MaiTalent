import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PlatformSettings {
  chat_enabled: boolean;
  payouts_enabled: boolean;
  gifts_enabled: boolean;
  purchases_enabled: boolean;
  new_registrations_enabled: boolean;
}

const defaultSettings: PlatformSettings = {
  chat_enabled: true,
  payouts_enabled: true,
  gifts_enabled: true,
  purchases_enabled: true,
  new_registrations_enabled: true,
};

export const usePlatformSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');

      if (error) throw error;

      const settingsObj: PlatformSettings = { ...defaultSettings };
      
      (data || []).forEach((s: { key: string; value: string }) => {
        if (s.key in settingsObj) {
          (settingsObj as unknown as Record<string, boolean>)[s.key] = s.value === 'true';
        }
      });

      setSettings(settingsObj);
    } catch (err) {
      console.error('Error fetching platform settings:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    isChatEnabled: settings.chat_enabled,
    isPayoutsEnabled: settings.payouts_enabled,
    isGiftsEnabled: settings.gifts_enabled,
    isPurchasesEnabled: settings.purchases_enabled,
    isRegistrationEnabled: settings.new_registrations_enabled,
    refetch: fetchSettings,
  };
};

export default usePlatformSettings;
