-- Create typing_status table for real-time typing indicators
CREATE TABLE IF NOT EXISTS typing_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS typing_status_user_recipient_unique 
ON typing_status (user_id, recipient_id);

-- Add RLS policy
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own typing status
CREATE POLICY "Users can manage their own typing status" ON typing_status
  FOR ALL USING (auth.uid() = user_id);

-- Allow users to see when others are typing to them
CREATE POLICY "Users can see typing status directed at them" ON typing_status
  FOR SELECT USING (auth.uid() = recipient_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS typing_status_user_id_idx ON typing_status (user_id);
CREATE INDEX IF NOT EXISTS typing_status_recipient_id_idx ON typing_status (recipient_id);
CREATE INDEX IF NOT EXISTS typing_status_last_updated_idx ON typing_status (last_updated);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_typing_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER typing_status_updated_at
  BEFORE UPDATE ON typing_status
  FOR EACH ROW
  EXECUTE FUNCTION update_typing_status_updated_at();