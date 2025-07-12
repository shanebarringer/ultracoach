-- Seed Sample Races
-- Create sample races for development and testing

DO $$
DECLARE
    sample_coach_id UUID;
BEGIN
    -- Try to find a coach user, or use NULL
    SELECT id INTO sample_coach_id FROM users WHERE role = 'coach' LIMIT 1;

    -- Insert popular ultra races for 2025 season
    INSERT INTO races (name, date, distance_miles, distance_type, location, elevation_gain_feet, terrain_type, website_url, notes, created_by) VALUES
    
    -- 50K Races
    ('Western States 50K', '2025-06-28', 31.07, '50K', 'Auburn, CA', 2500, 'trail', 'https://www.wser.org/', 'Lottery race with incredible mountain views', sample_coach_id),
    ('North Face Endurance Challenge 50K', '2025-05-17', 31.07, '50K', 'Marin County, CA', 4000, 'trail', 'https://www.thenorthface.com/', 'Technical trail running at its finest', sample_coach_id),
    ('Zion 50K', '2025-04-12', 31.07, '50K', 'Virgin, UT', 3500, 'trail', 'https://www.zionultra.com/', 'Desert running with stunning red rock scenery', sample_coach_id),
    
    -- 50 Mile Races  
    ('JFK 50 Mile', '2025-11-22', 50.0, '50M', 'Boonsboro, MD', 1200, 'mixed', 'https://www.jfk50mile.org/', 'America''s oldest 50-miler, mix of trail and road', sample_coach_id),
    ('Ice Age 50 Mile', '2025-05-10', 50.0, '50M', 'La Grange, WI', 3000, 'trail', 'https://www.iceagetrail.org/', 'Rolling Wisconsin trails through glacial terrain', sample_coach_id),
    ('Massanutten Mountain Trail 50M', '2025-05-17', 50.0, '50M', 'Front Royal, VA', 9500, 'trail', 'https://www.vhtrc.org/mmt/', 'Tough mountain trail with significant elevation', sample_coach_id),
    
    -- 100K Races
    ('Rocky Raccoon 100K', '2025-02-08', 62.14, '100K', 'Huntsville, TX', 600, 'trail', 'https://www.trailracingoverTexas.com/', 'Flat and fast 100K perfect for first-time hundo', sample_coach_id),
    ('Leadville Trail 100K', '2025-06-21', 62.14, '100K', 'Leadville, CO', 4500, 'trail', 'https://www.leadvilleraceseries.com/', 'High altitude mountain running above 10,000 feet', sample_coach_id),
    
    -- 100 Mile Races
    ('Western States 100', '2025-06-28', 100.0, '100M', 'Squaw Valley to Auburn, CA', 18000, 'trail', 'https://www.wser.org/', 'The granddaddy of all 100-milers', sample_coach_id),
    ('Leadville Trail 100', '2025-08-16', 100.0, '100M', 'Leadville, CO', 15600, 'trail', 'https://www.leadvilleraceseries.com/', 'Race across the sky - America''s highest 100-miler', sample_coach_id),
    ('Badwater 135', '2025-07-15', 135.0, '135M', 'Death Valley to Mt. Whitney, CA', 19000, 'road', 'https://www.badwaterultra.com/', 'The world''s toughest footrace', sample_coach_id),
    ('Big Sur Marathon', '2025-04-27', 26.2, 'Marathon', 'Big Sur, CA', 2000, 'road', 'https://www.bigsurmarathon.org/', 'Scenic coastal marathon with challenging hills', sample_coach_id),
    
    -- Training Races (shorter distances for build-up)
    ('Local Trail Half Marathon', '2025-03-15', 13.1, 'Half Marathon', 'Your Local Trails', 800, 'trail', NULL, 'Local training race for fitness testing', sample_coach_id),
    ('Spring Marathon Tune-up', '2025-04-05', 26.2, 'Marathon', 'Local Road Course', 500, 'road', NULL, 'Marathon distance training race', sample_coach_id),
    
    -- Recovery/Fun Races
    ('Thanksgiving Turkey Trot', '2025-11-27', 5.0, '5K', 'Local Park', 100, 'road', NULL, 'Fun family race for active recovery', sample_coach_id),
    ('New Year Resolution Run', '2025-01-01', 10.0, '10K', 'Local Trail', 300, 'trail', NULL, 'Start the year with a fun run', sample_coach_id),
    
    -- Winter/Indoor Options
    ('Treadmill Challenge 50K', '2025-01-15', 31.07, '50K', 'Local Gym', 0, 'treadmill', NULL, 'Indoor ultra for bad weather training', sample_coach_id),
    
    -- International Races
    ('Ultra-Trail du Mont-Blanc', '2025-08-29', 106.0, '100M', 'Chamonix, France', 32000, 'trail', 'https://www.utmb.world/', 'The most prestigious trail ultra in the world', sample_coach_id),
    ('Comrades Marathon', '2025-06-15', 56.0, '56M', 'Durban to Pietermaritzburg, South Africa', 4600, 'road', 'https://www.comrades.com/', 'The ultimate human race - up run year', sample_coach_id);

END $$;