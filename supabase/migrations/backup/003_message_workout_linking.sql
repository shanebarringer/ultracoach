-- Message-Workout Linking Schema
-- This migration adds the ability to link messages to specific workouts for context

-- 1. Add workout_id column to messages table for direct workout context
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL;

-- 2. Add workout context type to messages for better categorization
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS context_type VARCHAR(50) DEFAULT 'general';
    -- 'general', 'workout_feedback', 'workout_question', 'workout_update', 'workout_plan'

-- 3. Create message_workout_links table for many-to-many relationships
-- This allows a message to reference multiple workouts and vice versa
CREATE TABLE IF NOT EXISTS message_workout_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    link_type VARCHAR(50) DEFAULT 'reference',
        -- 'reference', 'feedback', 'question', 'update', 'plan_change'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, workout_id)
);

-- 4. Create conversations table to group related messages
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    runner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    training_plan_id UUID REFERENCES training_plans(id) ON DELETE SET NULL,
    title VARCHAR(255),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, runner_id, training_plan_id)
);

-- 5. Add conversation_id to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_workout_id ON messages(workout_id);
CREATE INDEX IF NOT EXISTS idx_messages_context_type ON messages(context_type);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_workout_links_message_id ON message_workout_links(message_id);
CREATE INDEX IF NOT EXISTS idx_message_workout_links_workout_id ON message_workout_links(workout_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach_runner ON conversations(coach_id, runner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_training_plan ON conversations(training_plan_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- 7. Enable RLS for new tables
ALTER TABLE message_workout_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for message_workout_links
CREATE POLICY "Users can view workout links for their messages" ON message_workout_links FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.id = message_workout_links.message_id 
        AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
    )
);

CREATE POLICY "Users can create workout links for their messages" ON message_workout_links FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.id = message_workout_links.message_id 
        AND m.sender_id = auth.uid()
    )
);

CREATE POLICY "Users can delete workout links for their messages" ON message_workout_links FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.id = message_workout_links.message_id 
        AND m.sender_id = auth.uid()
    )
);

-- 9. RLS Policies for conversations
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT 
USING (auth.uid() = coach_id OR auth.uid() = runner_id);

CREATE POLICY "Coaches can create conversations" ON conversations FOR INSERT 
WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Users can update their conversations" ON conversations FOR UPDATE 
USING (auth.uid() = coach_id OR auth.uid() = runner_id);

-- 10. Create trigger to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.conversation_id IS NOT NULL THEN
        UPDATE conversations 
        SET last_message_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_on_message 
    AFTER INSERT ON messages 
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- 11. Add trigger for conversations updated_at
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE message_workout_links;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- 13. Create helper function to get workout context for messages
CREATE OR REPLACE FUNCTION get_workout_context_for_message(message_id UUID)
RETURNS TABLE (
    workout_id UUID,
    workout_date DATE,
    planned_type TEXT,
    planned_distance DECIMAL,
    status TEXT,
    link_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id as workout_id,
        w.date as workout_date,
        w.planned_type,
        w.planned_distance,
        w.status,
        COALESCE(mwl.link_type, 'direct') as link_type
    FROM workouts w
    LEFT JOIN message_workout_links mwl ON w.id = mwl.workout_id AND mwl.message_id = $1
    LEFT JOIN messages m ON m.id = $1
    WHERE w.id = m.workout_id 
       OR w.id = mwl.workout_id
    ORDER BY w.date DESC;
END;
$$ language 'plpgsql';

-- 14. Create helper function to get messages for workout
CREATE OR REPLACE FUNCTION get_messages_for_workout(workout_id UUID)
RETURNS TABLE (
    message_id UUID,
    content TEXT,
    sender_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    context_type TEXT,
    link_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as message_id,
        m.content,
        u.full_name as sender_name,
        m.created_at,
        COALESCE(m.context_type, 'general') as context_type,
        COALESCE(mwl.link_type, 'direct') as link_type
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    LEFT JOIN message_workout_links mwl ON m.id = mwl.message_id AND mwl.workout_id = $1
    WHERE m.workout_id = $1 
       OR mwl.workout_id = $1
    ORDER BY m.created_at ASC;
END;
$$ language 'plpgsql';

COMMENT ON TABLE message_workout_links IS 'Links messages to workouts for contextual communication';
COMMENT ON TABLE conversations IS 'Groups related messages between coach and runner pairs';
COMMENT ON COLUMN messages.workout_id IS 'Direct reference to workout for simple context';
COMMENT ON COLUMN messages.context_type IS 'Type of workout-related communication';
COMMENT ON COLUMN messages.conversation_id IS 'Groups messages into conversations';