-- Add indexes for efficient JSONB querying on notifications.data column
-- Migration: 0014_add_notification_data_indexes

-- GIN index for general JSONB queries on the data column
-- Enables efficient queries like: WHERE data @> '{"sender_id": "some-id"}'
CREATE INDEX IF NOT EXISTS idx_notifications_data_gin
ON notifications USING gin (data);

-- Partial index for fast sender_id lookups in message notifications
-- Enables efficient queries like: WHERE data->>'sender_id' = 'some-id' AND type = 'message'
CREATE INDEX IF NOT EXISTS idx_notifications_message_sender
ON notifications ((data->>'sender_id'))
WHERE type = 'message' AND data IS NOT NULL;

-- Partial index for fast workout_id lookups in workout notifications
CREATE INDEX IF NOT EXISTS idx_notifications_workout_id
ON notifications ((data->>'workout_id'))
WHERE type = 'workout' AND data IS NOT NULL;

-- Partial index for fast plan_id lookups in training plan notifications
CREATE INDEX IF NOT EXISTS idx_notifications_plan_id
ON notifications ((data->>'plan_id'))
WHERE type = 'plan' AND data IS NOT NULL;

-- Add comments explaining the indexes
COMMENT ON INDEX idx_notifications_data_gin IS 'GIN index for general JSONB queries on notification metadata';
COMMENT ON INDEX idx_notifications_message_sender IS 'Partial index for fast sender_id lookups in message notifications';
COMMENT ON INDEX idx_notifications_workout_id IS 'Partial index for fast workout_id lookups in workout notifications';
COMMENT ON INDEX idx_notifications_plan_id IS 'Partial index for fast plan_id lookups in training plan notifications';
