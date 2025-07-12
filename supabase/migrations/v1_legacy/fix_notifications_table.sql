-- Check if notifications table exists and add missing columns
DO $$ 
BEGIN
  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'category'
  ) THEN
    ALTER TABLE notifications ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'general';
  END IF;

  -- Add type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'info';
  END IF;

  -- Add data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'data'
  ) THEN
    ALTER TABLE notifications ADD COLUMN data JSONB;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS notifications_category_idx ON notifications (category);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications (read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at);

-- Add RLS policies if they don't exist
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist and recreate them
  DROP POLICY IF EXISTS "Users can see their own notifications" ON notifications;
  DROP POLICY IF EXISTS "System can create notifications" ON notifications;
  DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

  -- Recreate policies
  CREATE POLICY "Users can see their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

  CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);
END $$;

-- Add archive functionality to training plans
DO $$
BEGIN
  -- Add archived column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_plans' AND column_name = 'archived'
  ) THEN
    ALTER TABLE training_plans ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add archived_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_plans' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE training_plans ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index for archived status
CREATE INDEX IF NOT EXISTS training_plans_archived_idx ON training_plans (archived);

-- Create triggers
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notifications_updated_at ON notifications;
CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

CREATE OR REPLACE FUNCTION set_training_plan_archived_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.archived = true AND OLD.archived = false THEN
    NEW.archived_at = NOW();
  ELSIF NEW.archived = false THEN
    NEW.archived_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS training_plans_archived_at ON training_plans;
CREATE TRIGGER training_plans_archived_at
  BEFORE UPDATE ON training_plans
  FOR EACH ROW
  EXECUTE FUNCTION set_training_plan_archived_at();