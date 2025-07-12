# UltraCoach Database Management

This directory contains SQL migrations, seed data, and management scripts for the UltraCoach database.

## 📁 Directory Structure

```
supabase/
├── migrations/
│   ├── v1_legacy/              # Original migration files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_password_hash.sql
│   │   └── *.sql               # Legacy setup files
│   └── v2_enhanced_training/   # Enhanced training system
│       └── 001_enhanced_training_schema.sql
├── seeds/
│   ├── 02_seed_training_phases.sql
│   ├── 03_seed_plan_templates.sql
│   ├── 04_seed_template_phases.sql
│   └── 05_seed_sample_races.sql
├── scripts/
│   ├── setup_enhanced_training.sh    # Complete setup script
│   ├── seed_database.sh              # Seed data only
│   ├── reset_database.sh             # Full reset (destructive)
│   ├── backup_user_data.sh           # Backup before changes
│   └── drop_enhanced_schema.sql      # Drop enhanced tables
└── README.md
```

## 🚀 Quick Start

### Initial Setup
```bash
# Set your database connection
export DATABASE_URL="your-supabase-connection-string"

# Run complete setup
./scripts/setup_enhanced_training.sh
```

### Common Operations
```bash
# Backup before major changes
./scripts/backup_user_data.sh

# Seed new data
./scripts/seed_database.sh

# Reset everything (DESTRUCTIVE)
./scripts/reset_database.sh
```

## 📊 Enhanced Training System

### New Tables

#### `races`
Target races that training plans are built around
- Race details (name, date, distance, location)
- Terrain and elevation information
- Links to training plans

#### `training_phases`
Standard periodization phases
- Base, Build, Peak, Taper, Recovery phases
- Focus areas and typical durations
- Used by templates and active plans

#### `plan_phases`
Tracks training plan progression
- Current phase tracking
- Phase-specific targets and dates
- Completion status

#### `plan_templates`
Reusable training plan templates
- Distance-specific templates (50K to 100M)
- Difficulty levels (beginner to advanced)
- Public and private templates

#### `template_phases`
Phase structure for templates
- Defines how templates are structured
- Duration and targets for each phase

### Enhanced Existing Tables

#### `training_plans` (new columns)
- Race targeting and goal types
- Plan sequencing (previous/next plans)
- Phase tracking and status
- Enhanced metadata

#### `workouts` (new columns)
- Phase association
- Workout categorization
- Intensity and terrain tracking
- Enhanced logging fields

## 🎯 Key Features

### Race-Centric Planning
- Training plans built around specific target races
- Goal types: completion, time goals, placement
- Real ultra races included in seed data

### Periodization Support
- Standard training phases with progression
- Phase-specific workout organization
- Automatic phase tracking

### Plan Templates
- 15+ pre-built templates for common distances
- Different approaches (beginner, time-goal, competitive)
- Reusable and customizable

### Plan Sequencing
- Link plans together for race progressions
- Base building between race cycles
- Bridge plans for fitness maintenance

## 🔧 Script Usage

### `setup_enhanced_training.sh`
Complete setup of enhanced training system
- Installs schema
- Seeds base data
- Optional sample races
- Interactive prompts

### `seed_database.sh`
Seeds database with templates and phases
- Training phases
- Plan templates
- Template structures
- Optional sample races

### `reset_database.sh`
**DESTRUCTIVE** - Resets enhanced training tables
- Drops all enhanced tables
- Rebuilds from scratch
- Re-seeds base data
- Requires explicit confirmation

### `backup_user_data.sh`
Backs up user data before schema changes
- Creates timestamped backups
- Includes all user tables
- Generates restore instructions
- **Run before major changes!**

## 🔒 Security

All tables include Row Level Security (RLS):
- Users can only access their own data
- Coaches can manage assigned runners' plans
- Public templates available to all users
- Secure by default

## 📈 Performance

Optimized with indexes for:
- Race date and creator queries
- Training plan status filtering
- Phase progression tracking
- Workout categorization

## ⚠️ Important Notes

### Before Schema Changes
1. **Always backup first**: `./scripts/backup_user_data.sh`
2. **Test in development** before production
3. **Review migration impact** on existing data

### Database Connections
Scripts support multiple connection methods:
- `DATABASE_URL` environment variable
- `SUPABASE_DB_URL` for Supabase CLI
- Automatic detection of available tools

### Legacy Support
- v1 migrations preserved in `migrations/v1_legacy/`
- Enhanced system builds on existing schema
- Backward compatible where possible

## 🆘 Troubleshooting

### Connection Issues
```bash
# Set database URL
export DATABASE_URL="postgresql://user:pass@host:port/db"

# Or link to Supabase project
supabase link --project-ref your-project-ref
```

### Permission Errors
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Schema Conflicts
```bash
# Check for existing enhanced tables
psql $DATABASE_URL -c "\dt+ races"

# Reset if needed
./scripts/reset_database.sh
```

## 📞 Support

For issues with the database setup:
1. Check the troubleshooting section above
2. Review script output for specific errors
3. Ensure proper database permissions
4. Verify Supabase CLI installation if using Supabase

The enhanced training system transforms UltraCoach into a professional ultramarathon coaching platform with proper periodization, race targeting, and plan progression!