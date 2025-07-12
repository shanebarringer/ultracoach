-- Create notifications table for user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  category VARCHAR(50) NOT NULL DEFAULT 'general', -- 'workout', 'training_plan', 'message', 'system'
  data JSONB, -- Additional data for actions/links
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own notifications
CREATE POLICY "Users can see their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Allow system to create notifications for users
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications (read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at);
CREATE INDEX IF NOT EXISTS notifications_category_idx ON notifications (category);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();