-- Enhanced Training Plans Schema
-- This script adds race goals, training phases, and plan sequencing

-- 1. Create races table for target events
CREATE TABLE IF NOT EXISTS races (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    distance_miles DECIMAL(6,2), -- e.g. 50.0, 100.0, 31.07 (50K)
    distance_type VARCHAR(50), -- '50K', '50M', '100K', '100M', 'Marathon', 'Custom'
    location VARCHAR(255),
    elevation_gain_feet INTEGER,
    terrain_type VARCHAR(50), -- 'trail', 'road', 'mixed'
    website_url TEXT,
    notes TEXT,
    created_by TEXT REFERENCES better_auth_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create training_phases table for periodization
CREATE TABLE IF NOT EXISTS training_phases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- 'Base', 'Build', 'Peak', 'Taper', 'Recovery'
    description TEXT,
    phase_order INTEGER NOT NULL, -- 1=Base, 2=Build, 3=Peak, 4=Taper, 5=Recovery
    typical_duration_weeks INTEGER,
    focus_areas TEXT[], -- ['aerobic_base', 'volume', 'intensity', 'race_simulation']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add new columns to training_plans table
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS race_id UUID REFERENCES races(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'race_specific', 
    -- 'race_specific', 'base_building', 'recovery', 'bridge'
ADD COLUMN IF NOT EXISTS goal_type VARCHAR(50) DEFAULT 'completion',
    -- 'completion', 'time_goal', 'placement'
ADD COLUMN IF NOT EXISTS goal_time_hours DECIMAL(5,2), -- e.g. 24.5 for sub-25 hour 100M
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS current_phase_id UUID REFERENCES training_phases(id),
ADD COLUMN IF NOT EXISTS phase_start_date DATE,
ADD COLUMN IF NOT EXISTS total_weeks INTEGER,
ADD COLUMN IF NOT EXISTS peak_weekly_miles INTEGER,
ADD COLUMN IF NOT EXISTS previous_plan_id UUID REFERENCES training_plans(id),
ADD COLUMN IF NOT EXISTS next_plan_id UUID REFERENCES training_plans(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
    -- 'draft', 'active', 'completed', 'paused', 'cancelled'

-- 4. Create plan_phases table to track phase progression
CREATE TABLE IF NOT EXISTS plan_phases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    training_plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES training_phases(id) ON DELETE CASCADE,
    phase_order INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    target_weekly_miles INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(training_plan_id, phase_order)
);

-- 5. Create plan_templates table for reusable training plans
CREATE TABLE IF NOT EXISTS plan_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    distance_type VARCHAR(50) NOT NULL, -- '50K', '50M', '100K', '100M'
    duration_weeks INTEGER NOT NULL,
    difficulty_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
    peak_weekly_miles INTEGER,
    min_base_miles INTEGER, -- prerequisite weekly miles
    created_by TEXT REFERENCES better_auth_users(id),
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[], -- ['mountain', 'road', 'first_ultra', 'time_goal']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create template_phases table for template structure
CREATE TABLE IF NOT EXISTS template_phases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES plan_templates(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES training_phases(id) ON DELETE CASCADE,
    phase_order INTEGER NOT NULL,
    duration_weeks INTEGER NOT NULL,
    target_weekly_miles INTEGER,
    description TEXT,
    UNIQUE(template_id, phase_order)
);

-- 7. Update workouts table for enhanced structure
ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES training_phases(id),
ADD COLUMN IF NOT EXISTS workout_category VARCHAR(50),
    -- 'easy', 'tempo', 'interval', 'long_run', 'race_simulation', 'recovery'
ADD COLUMN IF NOT EXISTS intensity_level INTEGER CHECK (intensity_level >= 1 AND intensity_level <= 10),
ADD COLUMN IF NOT EXISTS terrain_type VARCHAR(50), -- 'trail', 'road', 'track', 'treadmill'
ADD COLUMN IF NOT EXISTS elevation_gain_feet INTEGER,
ADD COLUMN IF NOT EXISTS weather_conditions TEXT,
ADD COLUMN IF NOT EXISTS effort_level INTEGER CHECK (effort_level >= 1 AND effort_level <= 10),
ADD COLUMN IF NOT EXISTS completed_with_group BOOLEAN DEFAULT FALSE;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_races_date ON races(date);
CREATE INDEX IF NOT EXISTS idx_races_created_by ON races(created_by);
CREATE INDEX IF NOT EXISTS idx_training_plans_race_id ON training_plans(race_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_status ON training_plans(status);
CREATE INDEX IF NOT EXISTS idx_training_plans_runner_id_status ON training_plans(runner_id, status);
CREATE INDEX IF NOT EXISTS idx_plan_phases_training_plan_id ON plan_phases(training_plan_id);
CREATE INDEX IF NOT EXISTS idx_workouts_phase_id ON workouts(phase_id);
CREATE INDEX IF NOT EXISTS idx_workouts_category ON workouts(workout_category);

-- 9. Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Add triggers for updated_at
CREATE TRIGGER update_races_updated_at 
    BEFORE UPDATE ON races 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_phases_updated_at 
    BEFORE UPDATE ON plan_phases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_templates_updated_at 
    BEFORE UPDATE ON plan_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Add RLS policies
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_phases ENABLE ROW LEVEL SECURITY;

-- Races policies
CREATE POLICY "Users can view all races" ON races FOR SELECT USING (true);
CREATE POLICY "Users can create races" ON races FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) = created_by);
CREATE POLICY "Users can update their races" ON races FOR UPDATE USING (current_setting('app.current_user_id', true) = created_by);
CREATE POLICY "Users can delete their races" ON races FOR DELETE USING (current_setting('app.current_user_id', true) = created_by);

-- Training phases policies (read-only for most users)
CREATE POLICY "Users can view training phases" ON training_phases FOR SELECT USING (true);

-- Plan phases policies
CREATE POLICY "Coach and runner can view plan phases" ON plan_phases FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM training_plans tp 
        WHERE tp.id = plan_phases.training_plan_id 
        AND (tp.coach_id = current_setting('app.current_user_id', true) OR tp.runner_id = current_setting('app.current_user_id', true))
    )
);

CREATE POLICY "Coach can manage plan phases" ON plan_phases FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM training_plans tp 
        WHERE tp.id = plan_phases.training_plan_id 
        AND tp.coach_id = current_setting('app.current_user_id', true)
    )
);

-- Plan templates policies
CREATE POLICY "Users can view public templates" ON plan_templates FOR SELECT 
USING (is_public = true OR created_by = current_setting('app.current_user_id', true));

CREATE POLICY "Users can create templates" ON plan_templates FOR INSERT 
WITH CHECK (created_by = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their templates" ON plan_templates FOR UPDATE 
USING (created_by = current_setting('app.current_user_id', true));

-- Template phases policies
CREATE POLICY "Users can view template phases" ON template_phases FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM plan_templates pt 
        WHERE pt.id = template_phases.template_id 
        AND (pt.is_public = true OR pt.created_by = current_setting('app.current_user_id', true))
    )
);

CREATE POLICY "Users can manage their template phases" ON template_phases FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM plan_templates pt 
        WHERE pt.id = template_phases.template_id 
        AND pt.created_by = current_setting('app.current_user_id', true)
    )
);

COMMENT ON TABLE races IS 'Target races that training plans are built around';
COMMENT ON TABLE training_phases IS 'Standard training phases for periodization';
COMMENT ON TABLE plan_phases IS 'Tracks which phase a training plan is currently in';
COMMENT ON TABLE plan_templates IS 'Reusable training plan templates';
COMMENT ON TABLE template_phases IS 'Phase structure for training plan templates';
