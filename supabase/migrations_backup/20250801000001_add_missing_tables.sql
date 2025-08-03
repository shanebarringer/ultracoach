-- Add missing tables for complete schema support
-- This migration adds tables that were defined in schema.ts but missing from initial migration

-- Create training_phases table
CREATE TABLE IF NOT EXISTS training_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  phase_order INTEGER NOT NULL,
  typical_duration_weeks INTEGER,
  focus_areas TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plan_templates table  
CREATE TABLE IF NOT EXISTS plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  distance_type TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL,
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  peak_weekly_miles DECIMAL(5,2),
  min_base_miles DECIMAL(5,2),
  is_public BOOLEAN DEFAULT true,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create template_phases table (links plan templates to training phases)
CREATE TABLE IF NOT EXISTS template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES training_phases(id) ON DELETE CASCADE,
  phase_order INTEGER NOT NULL,
  duration_weeks INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create races table (for race-specific training plans)
CREATE TABLE IF NOT EXISTS races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date TIMESTAMPTZ,
  location TEXT,
  distance TEXT,
  terrain TEXT,
  elevation_gain INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_training_phases_order ON training_phases(phase_order);
CREATE INDEX IF NOT EXISTS idx_plan_templates_difficulty ON plan_templates(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_plan_templates_distance ON plan_templates(distance_type);
CREATE INDEX IF NOT EXISTS idx_template_phases_template ON template_phases(template_id);
CREATE INDEX IF NOT EXISTS idx_template_phases_phase ON template_phases(phase_id);
CREATE INDEX IF NOT EXISTS idx_races_date ON races(date);