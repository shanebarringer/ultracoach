-- Coach Connections Bidirectional Uniqueness
-- Migration: 0017_coach_connections_bidirectional_unique.sql
--
-- This migration ensures that coach connections are truly bidirectional unique.
-- The existing UNIQUE (coach_a_id, coach_b_id) only prevents duplicate (A, B) pairs,
-- but allows both (A, B) and (B, A) to exist as separate rows.
--
-- This functional index ensures that regardless of which coach is A or B,
-- only one connection can exist between any pair of coaches.

-- Drop the existing unique constraint that doesn't enforce bidirectionality
ALTER TABLE coach_connections DROP CONSTRAINT IF EXISTS unique_coach_connection;
ALTER TABLE coach_connections DROP CONSTRAINT IF EXISTS coach_connections_coach_a_id_coach_b_id_key;

-- Create a unique index that enforces bidirectional uniqueness
-- LEAST/GREATEST normalizes the order so (A, B) and (B, A) resolve to the same index key
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_connections_bidirectional_unique
ON coach_connections (LEAST(coach_a_id, coach_b_id), GREATEST(coach_a_id, coach_b_id));

-- Add comment explaining the constraint
COMMENT ON INDEX idx_coach_connections_bidirectional_unique IS 'Ensures bidirectional uniqueness - only one connection can exist between any two coaches regardless of A/B order';
