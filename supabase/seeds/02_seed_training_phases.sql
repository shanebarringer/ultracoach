-- Seed Training Phases
-- Insert standard training phases used in ultramarathon training

INSERT INTO training_phases (name, description, phase_order, typical_duration_weeks, focus_areas) VALUES
('Base Building', 
 'Aerobic base development with high volume, low intensity running. Focus on time on feet and building mitochondrial density.', 
 1, 
 8, 
 ARRAY['aerobic_base', 'volume', 'consistency', 'injury_prevention']),

('Build Phase', 
 'Introduction of race-specific workouts including tempo runs, intervals, and hill training. Maintain base while adding intensity.', 
 2, 
 6, 
 ARRAY['lactate_threshold', 'vo2_max', 'race_pace', 'strength']),

('Peak Phase', 
 'Highest training load with race simulation workouts. Practice race-day nutrition and pacing strategies.', 
 3, 
 3, 
 ARRAY['race_simulation', 'peak_fitness', 'race_practice', 'mental_preparation']),

('Taper', 
 'Reduce training volume while maintaining intensity. Allow body to recover and absorb training adaptations.', 
 4, 
 2, 
 ARRAY['recovery', 'race_readiness', 'mental_preparation', 'race_logistics']),

('Recovery', 
 'Post-race recovery with easy running or cross-training. Focus on physical and mental restoration.', 
 5, 
 2, 
 ARRAY['recovery', 'regeneration', 'reflection', 'planning']);

-- Insert some intermediate phases for longer training cycles
INSERT INTO training_phases (name, description, phase_order, typical_duration_weeks, focus_areas) VALUES
('Base Building Extended', 
 'Extended aerobic base phase for longer races (100M+). Emphasizes time on feet and back-to-back long runs.', 
 1, 
 12, 
 ARRAY['aerobic_base', 'volume', 'back_to_back_runs', 'fat_adaptation']),

('Strength Build', 
 'Combination of base building with hill training and strength work. Prepares for more intense training ahead.', 
 2, 
 4, 
 ARRAY['hill_strength', 'muscular_endurance', 'form', 'durability']),

('Specific Build', 
 'Race-specific training with emphasis on goal race terrain and conditions. High-intensity work.', 
 3, 
 4, 
 ARRAY['race_specificity', 'goal_pace', 'terrain_practice', 'race_fueling']),

('Mini Taper', 
 'Short recovery period used during longer training cycles. Maintains fitness while allowing recovery.', 
 4, 
 1, 
 ARRAY['recovery', 'fitness_maintenance', 'preparation']),

('Active Recovery', 
 'Light activity during break periods. May include easy jogging, walking, or cross-training.', 
 5, 
 1, 
 ARRAY['active_recovery', 'cross_training', 'mental_break']);