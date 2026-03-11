-- IP Ban Migration
-- This adds IP banning capability for the CEO to block users

-- Create banned_ips table to store banned IP addresses and networks
CREATE TABLE IF NOT EXISTS public.banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  ip_network TEXT,
  reason TEXT,
  banned_by UUID REFERENCES auth.users(id),
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

-- Policy: Only CEOs can manage banned IPs
CREATE POLICY "Only CEOs can manage banned IPs" ON public.banned_ips
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'ceo'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_banned_ips_active ON public.banned_ips(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON public.banned_ips(ip_address) WHERE is_active = true;

-- Function to check if an IP is banned
CREATE OR REPLACE FUNCTION public.is_ip_banned(p_ip_address TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_banned BOOLEAN := false;
  v_banned_network BOOLEAN := false;
  v_cidr TEXT;
  v_banned_record RECORD;
BEGIN
  -- Check exact IP match
  SELECT EXISTS (
    SELECT 1 FROM public.banned_ips
    WHERE ip_address = p_ip_address
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_banned;

  IF v_banned THEN
    RETURN true;
  END IF;

  -- Check CIDR network matches
  FOR v_banned_record IN 
    SELECT ip_network FROM public.banned_ips
    WHERE ip_network IS NOT NULL
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  LOOP
    BEGIN
      v_cidr := v_banned_record.ip_network;
      -- Use host() to extract the IP part from CIDR and compare
      IF p_ip_address <<= v_cidr THEN
        RETURN true;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Skip invalid CIDR notation
      CONTINUE;
    END;
  END LOOP;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client IP from request headers
CREATE OR REPLACE FUNCTION public.get_client_ip()
RETURNS TEXT AS $$
DECLARE
  v_ip TEXT;
BEGIN
  -- Try different headers in order (common proxies)
  v_ip := current_setting('request.headers', true)::json->>'cf-connecting-ip';
  IF v_ip IS NULL OR v_ip = '' THEN
    v_ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
  END IF;
  IF v_ip IS NULL OR v_ip = '' THEN
    v_ip := current_setting('request.headers', true)::json->>'x-real-ip';
  END IF;
  IF v_ip IS NULL OR v_ip = '' THEN
    -- Fallback to connection info
    v_ip := current_setting('request.connection.remote_host', true);
  END IF;
  
  -- x-forwarded-for can contain multiple IPs, take the first one
  IF v_ip LIKE '%,%' THEN
    v_ip := split_part(v_ip, ',', 1);
  END IF;
  
  RETURN trim(v_ip);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE public.banned_ips IS 'Stores banned IP addresses and networks for blocking users';
COMMENT ON FUNCTION public.is_ip_banned(TEXT) IS 'Check if an IP address is currently banned';
COMMENT ON FUNCTION public.get_client_ip() IS 'Get the client IP address from request headers';
