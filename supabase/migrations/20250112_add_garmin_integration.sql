-- Garmin Connect IQ Integration - Database Schema
-- Created: 2025-01-12
-- Epic: ULT-16 - Garmin Connect IQ App Development

-- Enable pgcrypto extension for token encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Table: garmin_connections
-- Purpose: Store Garmin OAuth tokens and connection metadata
-- ============================================
CREATE TABLE IF NOT EXISTS garmin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
  garmin_user_id TEXT NOT NULL,

  -- OAuth tokens (encrypted at rest using pgcrypto)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT, -- e.g., 'ACTIVITY_WRITE,ACTIVITY_READ'

  -- Connection metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'expired', 'disconnected')),

  -- Unique constraint: one Garmin connection per user
  CONSTRAINT garmin_connections_user_id_unique UNIQUE(user_id)
);

-- ============================================
-- Table: garmin_workout_syncs
-- Purpose: Track workout synchronization between UltraCoach and Garmin
-- ============================================
CREATE TABLE IF NOT EXISTS garmin_workout_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,

  -- Garmin identifiers
  garmin_workout_id TEXT, -- Garmin's workout ID in their calendar
  garmin_activity_id BIGINT, -- Completed activity ID (after workout completion)

  -- Sync metadata
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('to_garmin', 'from_garmin')),
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'failed')),
  sync_error TEXT,
  synced_at TIMESTAMPTZ,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint: one sync record per workout per direction
  CONSTRAINT garmin_workout_syncs_workout_direction_unique UNIQUE(workout_id, sync_direction)
);

-- ============================================
-- Table: garmin_devices (Optional - for device-specific features)
-- Purpose: Store information about user's Garmin devices
-- ============================================
CREATE TABLE IF NOT EXISTS garmin_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,

  -- Device information
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL, -- e.g., "Fenix 7", "Forerunner 955"
  device_model TEXT,
  firmware_version TEXT,

  -- Activity tracking
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint: one record per user per device
  CONSTRAINT garmin_devices_user_device_unique UNIQUE(user_id, device_id)
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- garmin_connections indexes
CREATE INDEX IF NOT EXISTS idx_garmin_connections_user_id
  ON garmin_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_garmin_connections_sync_status
  ON garmin_connections(sync_status)
  WHERE sync_status = 'active'; -- Partial index for active connections

-- garmin_workout_syncs indexes
CREATE INDEX IF NOT EXISTS idx_garmin_workout_syncs_workout_id
  ON garmin_workout_syncs(workout_id);

CREATE INDEX IF NOT EXISTS idx_garmin_workout_syncs_garmin_activity_id
  ON garmin_workout_syncs(garmin_activity_id)
  WHERE garmin_activity_id IS NOT NULL; -- Partial index for completed activities

CREATE INDEX IF NOT EXISTS idx_garmin_workout_syncs_sync_status
  ON garmin_workout_syncs(sync_status);

CREATE INDEX IF NOT EXISTS idx_garmin_workout_syncs_synced_at
  ON garmin_workout_syncs(synced_at DESC);

-- garmin_devices indexes
CREATE INDEX IF NOT EXISTS idx_garmin_devices_user_id
  ON garmin_devices(user_id);

CREATE INDEX IF NOT EXISTS idx_garmin_devices_last_seen
  ON garmin_devices(last_seen_at DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE garmin_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE garmin_workout_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE garmin_devices ENABLE ROW LEVEL SECURITY;

-- garmin_connections policies
-- Users can only access their own Garmin connections
CREATE POLICY garmin_connections_user_policy ON garmin_connections
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true)::TEXT);

-- garmin_workout_syncs policies
-- Users can only access sync records for their own workouts
CREATE POLICY garmin_workout_syncs_user_policy ON garmin_workout_syncs
  FOR ALL
  USING (
    workout_id IN (
      SELECT id FROM workouts
      WHERE user_id = current_setting('app.current_user_id', true)::TEXT
    )
  );

-- garmin_devices policies
-- Users can only access their own devices
CREATE POLICY garmin_devices_user_policy ON garmin_devices
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true)::TEXT);

-- ============================================
-- Helper Functions
-- ============================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updated_at updates
CREATE TRIGGER update_garmin_connections_updated_at
  BEFORE UPDATE ON garmin_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_garmin_workout_syncs_updated_at
  BEFORE UPDATE ON garmin_workout_syncs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Token Encryption Helper Functions
-- ============================================

-- Function: Encrypt OAuth tokens before storage
-- Usage: SELECT encrypt_garmin_token('my_access_token', 'encryption_key');
CREATE OR REPLACE FUNCTION encrypt_garmin_token(token TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(token, encryption_key),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Decrypt OAuth tokens when reading
-- Usage: SELECT decrypt_garmin_token(encrypted_token, 'encryption_key');
CREATE OR REPLACE FUNCTION decrypt_garmin_token(encrypted_token TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_token, 'base64'),
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL; -- Return NULL if decryption fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE garmin_connections IS 'Stores Garmin OAuth connection credentials with encrypted tokens';
COMMENT ON TABLE garmin_workout_syncs IS 'Tracks synchronization status between UltraCoach workouts and Garmin calendar';
COMMENT ON TABLE garmin_devices IS 'Optional table for storing user device information for device-specific features';

COMMENT ON COLUMN garmin_connections.access_token IS 'Encrypted OAuth access token (use decrypt_garmin_token function)';
COMMENT ON COLUMN garmin_connections.refresh_token IS 'Encrypted OAuth refresh token (use decrypt_garmin_token function)';
COMMENT ON COLUMN garmin_workout_syncs.sync_direction IS 'Direction of sync: to_garmin (UltraCoach → Garmin) or from_garmin (Garmin → UltraCoach)';
COMMENT ON COLUMN garmin_workout_syncs.garmin_workout_id IS 'Garmin''s internal workout ID in their calendar system';
COMMENT ON COLUMN garmin_workout_syncs.garmin_activity_id IS 'Garmin''s activity ID after workout completion (for import)';

-- ============================================
-- Validation Queries (Run after migration)
-- ============================================

-- Verify tables were created
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'garmin_%';

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename LIKE 'garmin_%';

-- Verify indexes
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public' AND tablename LIKE 'garmin_%';

-- Test encryption functions
-- SELECT encrypt_garmin_token('test_token', 'test_key');
-- SELECT decrypt_garmin_token(encrypt_garmin_token('test_token', 'test_key'), 'test_key');
