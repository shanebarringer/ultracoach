-- Seed Training Plan Templates
-- Create standard training plan templates for common ultra distances

-- First, let's create a coach user for template creation (if needed)
-- This will be the system/default coach for public templates
DO $$
DECLARE
    default_coach_id TEXT;
BEGIN
    -- Try to find an existing coach, or use a placeholder
    SELECT id INTO default_coach_id FROM better_auth_users WHERE user_type = 'coach' LIMIT 1;
    
    -- If no coach exists, we'll just use a NULL created_by for public templates
    IF default_coach_id IS NULL THEN
        default_coach_id := NULL;
    END IF;

    -- 50K Training Plans
    INSERT INTO plan_templates (name, description, distance_type, duration_weeks, difficulty_level, peak_weekly_miles, min_base_miles, created_by, is_public, tags) VALUES
    ('50K Beginner - First Ultra', 
     'A gentle introduction to ultra distance. Perfect for runners with marathon experience looking to step up to their first 50K.', 
     '50K', 16, 'beginner', 50, 25, default_coach_id, true, 
     ARRAY['first_ultra', 'beginner', 'trail', 'completion_focused']),
    
    ('50K Intermediate - Time Goal', 
     'For experienced ultra runners targeting a specific 50K time. Includes tempo work and race pace training.', 
     '50K', 16, 'intermediate', 65, 40, default_coach_id, true, 
     ARRAY['time_goal', 'intermediate', 'trail', 'performance']),
    
    ('50K Advanced - Competitive', 
     'High-volume plan for competitive 50K racing. Includes advanced workouts and high weekly mileage.', 
     '50K', 18, 'advanced', 80, 55, default_coach_id, true, 
     ARRAY['competitive', 'advanced', 'high_volume', 'performance']),

    -- 50 Mile Training Plans
    ('50 Mile Beginner - Step Up', 
     'Progression from 50K to 50 miles. Emphasizes time on feet and back-to-back long runs.', 
     '50M', 20, 'beginner', 65, 35, default_coach_id, true, 
     ARRAY['progression', 'beginner', 'trail', 'time_on_feet']),
    
    ('50 Mile Intermediate - Sub-10', 
     'Targeting sub-10 hour 50-miler. Balanced approach with tempo work and long runs.', 
     '50M', 20, 'intermediate', 80, 50, default_coach_id, true, 
     ARRAY['time_goal', 'intermediate', 'sub_10', 'balanced']),
    
    ('50 Mile Advanced - Sub-8', 
     'Aggressive plan for sub-8 hour 50-mile goal. High intensity and volume.', 
     '50M', 22, 'advanced', 100, 65, default_coach_id, true, 
     ARRAY['time_goal', 'advanced', 'sub_8', 'high_intensity']),

    -- 100K Training Plans
    ('100K Beginner - First Hundo', 
     'Conservative approach to first 100K. Focus on completion and enjoying the experience.', 
     '100K', 24, 'beginner', 70, 40, default_coach_id, true, 
     ARRAY['first_100k', 'beginner', 'completion', 'conservative']),
    
    ('100K Intermediate - Strong Finish', 
     'Build fitness for a strong 100K finish. Emphasis on back-to-back runs and race simulation.', 
     '100K', 24, 'intermediate', 90, 55, default_coach_id, true, 
     ARRAY['intermediate', 'strong_finish', 'race_simulation']),

    -- 100 Mile Training Plans
    ('100 Mile Beginner - Completion', 
     'Conservative 100-mile plan focused on finishing. Long build-up with emphasis on time on feet.', 
     '100M', 28, 'beginner', 80, 45, default_coach_id, true, 
     ARRAY['first_100m', 'beginner', 'completion', 'conservative']),
    
    ('100 Mile Intermediate - Sub-24', 
     'Targeting sub-24 hour 100-miler. Balanced high-volume approach with race-specific training.', 
     '100M', 30, 'intermediate', 100, 60, default_coach_id, true, 
     ARRAY['time_goal', 'intermediate', 'sub_24', 'balanced']),
    
    ('100 Mile Advanced - Sub-20', 
     'Elite-level plan for sub-20 hour 100-mile goal. Very high volume and intensity.', 
     '100M', 32, 'advanced', 130, 80, default_coach_id, true, 
     ARRAY['time_goal', 'advanced', 'sub_20', 'elite']),

    -- Base Building Templates
    ('Winter Base Building', 
     'Off-season base building plan. Build aerobic fitness during winter months.', 
     'Base', 12, 'intermediate', 70, 30, default_coach_id, true, 
     ARRAY['base_building', 'off_season', 'aerobic', 'winter']),
    
    ('Post-Race Recovery & Base', 
     'Recovery from 100M+ race with gradual return to base building.', 
     'Recovery', 8, 'intermediate', 50, 20, default_coach_id, true, 
     ARRAY['recovery', 'post_race', 'gradual_return']),

    -- Bridge Templates
    ('50K to 50M Bridge', 
     'Short bridge plan between 50K and 50M races. Maintain fitness while recovering.', 
     'Bridge', 6, 'intermediate', 60, 40, default_coach_id, true, 
     ARRAY['bridge', 'race_sequence', 'maintenance']),
    
    ('Early Season Prep', 
     'Prepare for race season after base building. Introduction of intensity.', 
     'Bridge', 8, 'intermediate', 65, 45, default_coach_id, true, 
     ARRAY['season_prep', 'intensity_intro', 'race_prep']);

END $$;