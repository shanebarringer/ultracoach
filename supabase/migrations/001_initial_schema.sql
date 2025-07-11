-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('runner', 'coach')),
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create training_plans table
CREATE TABLE training_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    runner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_race_date DATE,
    target_race_distance TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workouts table
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    planned_distance DECIMAL(5,2),
    planned_duration INTEGER, -- in minutes
    planned_type TEXT,
    actual_distance DECIMAL(5,2),
    actual_duration INTEGER, -- in minutes
    actual_type TEXT,
    injury_notes TEXT,
    workout_notes TEXT,
    coach_feedback TEXT,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'skipped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('message', 'workout', 'comment')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_training_plans_coach_id ON training_plans(coach_id);
CREATE INDEX idx_training_plans_runner_id ON training_plans(runner_id);
CREATE INDEX idx_workouts_training_plan_id ON workouts(training_plan_id);
CREATE INDEX idx_workouts_date ON workouts(date);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for training_plans table
CREATE POLICY "Coaches can view their training plans" ON training_plans
    FOR SELECT USING (
        auth.uid() = coach_id OR 
        auth.uid() = runner_id
    );

CREATE POLICY "Coaches can create training plans" ON training_plans
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their training plans" ON training_plans
    FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their training plans" ON training_plans
    FOR DELETE USING (auth.uid() = coach_id);

-- RLS Policies for workouts table
CREATE POLICY "Users can view workouts from their training plans" ON workouts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM training_plans tp 
            WHERE tp.id = training_plan_id 
            AND (tp.coach_id = auth.uid() OR tp.runner_id = auth.uid())
        )
    );

CREATE POLICY "Coaches can create workouts" ON workouts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM training_plans tp 
            WHERE tp.id = training_plan_id 
            AND tp.coach_id = auth.uid()
        )
    );

CREATE POLICY "Users can update workouts from their training plans" ON workouts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM training_plans tp 
            WHERE tp.id = training_plan_id 
            AND (tp.coach_id = auth.uid() OR tp.runner_id = auth.uid())
        )
    );

-- RLS Policies for messages table
CREATE POLICY "Users can view their messages" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = recipient_id
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" ON messages
    FOR UPDATE USING (auth.uid() = recipient_id);

-- RLS Policies for notifications table
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Functions to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_plans_updated_at BEFORE UPDATE ON training_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (p_user_id, p_type, p_title, p_message)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ language 'plpgsql';

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE workouts;