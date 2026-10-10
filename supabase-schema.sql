-- =========================================================================
-- CHINESE SIGNALS AI BOT - SUPABASE DATABASE SCHEMA
-- License Key Authentication & Device Binding System
-- =========================================================================

-- Enable pgcrypto extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the licenses table
CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(32) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unused', -- 'unused', 'active', 'revoked', 'expired'
  duration_days INTEGER NOT NULL DEFAULT 30,   -- 1, 7, 30, or -1 (lifetime)
  expires_at TIMESTAMPTZ,
  device_id VARCHAR(128),
  device_fingerprint TEXT,
  last_ip VARCHAR(64),
  last_used_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ultra-fast query lookups on high concurrency
CREATE INDEX IF NOT EXISTS idx_licenses_key ON public.licenses(key);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_device_id ON public.licenses(device_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON public.licenses(expires_at);

-- Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_licenses_updated_at ON public.licenses;
CREATE TRIGGER set_licenses_updated_at
BEFORE UPDATE ON public.licenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Note: Service Role Key bypasses RLS automatically.
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Deny public anon access to prevent public querying of license keys
DROP POLICY IF EXISTS "Deny anon access to licenses" ON public.licenses;
CREATE POLICY "Deny anon access to licenses" ON public.licenses
  FOR ALL
  TO anon
  USING (false);

-- Insert sample test keys for initial deployment
INSERT INTO public.licenses (key, status, duration_days, note)
VALUES 
  ('CSAI-DEMO-7DAY-TEST', 'unused', 7, '7-Day Demo Test Key'),
  ('CSAI-VIP1-30DY-TEST', 'unused', 30, '30-Day VIP Test Key'),
  ('CSAI-LIFE-PASS-TEST', 'unused', -1, 'Lifetime Access Master Key')
ON CONFLICT (key) DO NOTHING;
