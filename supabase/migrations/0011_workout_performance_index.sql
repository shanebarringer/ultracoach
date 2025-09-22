-- Migration: Add optimized composite index for workout queries
-- Improves performance for ORDER BY date DESC, created_at DESC queries
-- Addresses ULT-29 performance feedback

-- Add composite index for optimal workout sorting performance
-- This index supports the common query pattern: ORDER BY date DESC, created_at DESC
CREATE INDEX IF NOT EXISTS idx_workouts_date_created_desc ON workouts (date DESC, created_at DESC);

-- Add comment to document the index purpose
COMMENT ON INDEX idx_workouts_date_created_desc IS 'Composite index for optimal workout sorting by date DESC, created_at DESC. Addresses ULT-29 performance requirements.';