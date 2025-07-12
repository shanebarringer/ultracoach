-- Seed Template Phases
-- Define the phase structure for each training plan template

DO $$
DECLARE
    template_rec RECORD;
    base_phase_id UUID;
    strength_phase_id UUID;
    build_phase_id UUID;
    peak_phase_id UUID;
    taper_phase_id UUID;
    recovery_phase_id UUID;
BEGIN
    -- Get phase IDs
    SELECT id INTO base_phase_id FROM training_phases WHERE name = 'Base Building';
    SELECT id INTO strength_phase_id FROM training_phases WHERE name = 'Strength Build';
    SELECT id INTO build_phase_id FROM training_phases WHERE name = 'Build Phase';
    SELECT id INTO peak_phase_id FROM training_phases WHERE name = 'Peak Phase';
    SELECT id INTO taper_phase_id FROM training_phases WHERE name = 'Taper';
    SELECT id INTO recovery_phase_id FROM training_phases WHERE name = 'Recovery';

    -- 50K Beginner (16 weeks total)
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, base_phase_id, 1, 8, 35, 'Build aerobic base with easy running'
    FROM plan_templates WHERE name = '50K Beginner - First Ultra';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, build_phase_id, 2, 5, 45, 'Add tempo runs and hill work'
    FROM plan_templates WHERE name = '50K Beginner - First Ultra';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, taper_phase_id, 3, 3, 30, 'Reduce volume and prepare for race'
    FROM plan_templates WHERE name = '50K Beginner - First Ultra';

    -- 50K Intermediate (16 weeks total)
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, base_phase_id, 1, 6, 50, 'Solid aerobic base'
    FROM plan_templates WHERE name = '50K Intermediate - Time Goal';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, build_phase_id, 2, 6, 60, 'Race pace and tempo work'
    FROM plan_templates WHERE name = '50K Intermediate - Time Goal';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, peak_phase_id, 3, 2, 65, 'Peak fitness and race simulation'
    FROM plan_templates WHERE name = '50K Intermediate - Time Goal';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, taper_phase_id, 4, 2, 40, 'Final preparation'
    FROM plan_templates WHERE name = '50K Intermediate - Time Goal';

    -- 50 Mile Beginner (20 weeks total)
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, base_phase_id, 1, 10, 45, 'Extended base building for longer distance'
    FROM plan_templates WHERE name = '50 Mile Beginner - Step Up';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, strength_phase_id, 2, 4, 55, 'Hill strength and back-to-back runs'
    FROM plan_templates WHERE name = '50 Mile Beginner - Step Up';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, build_phase_id, 3, 4, 60, 'Race-specific training'
    FROM plan_templates WHERE name = '50 Mile Beginner - Step Up';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, taper_phase_id, 4, 2, 45, 'Taper and race prep'
    FROM plan_templates WHERE name = '50 Mile Beginner - Step Up';

    -- 100K Beginner (24 weeks total)
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, base_phase_id, 1, 12, 50, 'Long base building phase'
    FROM plan_templates WHERE name = '100K Beginner - First Hundo';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, strength_phase_id, 2, 6, 60, 'Strength and endurance building'
    FROM plan_templates WHERE name = '100K Beginner - First Hundo';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, build_phase_id, 3, 4, 65, 'Race preparation and simulation'
    FROM plan_templates WHERE name = '100K Beginner - First Hundo';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, taper_phase_id, 4, 2, 50, 'Final taper'
    FROM plan_templates WHERE name = '100K Beginner - First Hundo';

    -- 100 Mile Beginner (28 weeks total)
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, base_phase_id, 1, 16, 55, 'Extensive base building for 100M'
    FROM plan_templates WHERE name = '100 Mile Beginner - Completion';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, strength_phase_id, 2, 6, 65, 'Hill strength and time on feet'
    FROM plan_templates WHERE name = '100 Mile Beginner - Completion';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, build_phase_id, 3, 4, 75, 'Race-specific preparation'
    FROM plan_templates WHERE name = '100 Mile Beginner - Completion';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, taper_phase_id, 4, 2, 55, 'Final preparation and taper'
    FROM plan_templates WHERE name = '100 Mile Beginner - Completion';

    -- Base Building Template (12 weeks)
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, base_phase_id, 1, 12, 60, 'Pure aerobic base building'
    FROM plan_templates WHERE name = 'Winter Base Building';

    -- Bridge Template (6 weeks)
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, recovery_phase_id, 1, 2, 40, 'Recovery from previous race'
    FROM plan_templates WHERE name = '50K to 50M Bridge';
    
    INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks, target_weekly_miles, description)
    SELECT id, base_phase_id, 2, 4, 55, 'Maintain fitness for next race'
    FROM plan_templates WHERE name = '50K to 50M Bridge';

END $$;