-- Add data column to notifications table for storing metadata
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;

-- Add comment to explain the column purpose
COMMENT ON COLUMN notifications.data IS 'JSON metadata for notifications (e.g., sender_id for message notifications)';
