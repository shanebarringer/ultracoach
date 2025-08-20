
// Common types for API operations

export interface SyncOptions {
  update_status?: boolean
  update_actual_data?: boolean
  update_notes?: boolean
  overwrite_existing?: boolean
}

export interface SyncPreferences {
  update_status?: boolean
  update_actual_data?: boolean
  update_notes?: boolean
  preserve_planned_data?: boolean
  auto_categorize?: boolean
  calculate_intensity?: boolean
  detect_terrain?: boolean
}

export interface MatchOptions {
  date_tolerance?: number
  distance_tolerance?: number
  duration_tolerance?: number
  min_confidence?: number
}

export type WorkoutUpdateData = {
  status?: string
  actual_distance?: string
  actual_duration?: number
  actual_type?: string
  avg_heart_rate?: number
  elevation_gain?: number
  terrain?: string
  intensity?: number
  workout_notes?: string
  category?: string
  mergeHistory?: string
}

export interface MatchOptions {
  dateTolerance?: number;
  distanceTolerance?: number;
  durationTolerance?: number;
  minConfidence?: number;
}

export interface BulkMatchSummary {
  total: { activities: number; workouts: number; matches: number };
  by_confidence: { exact: number; probable: number; possible: number; conflicts: number };
  unmatched_workouts: number;
  suggestions: string[];
}

export interface SingleMatchSummary {
  total: { activities: number; workouts: number; matches: number };
  best_match: {
    confidence: number;
    match_type: string;
    workout_id: string;
    discrepancies_count: number;
  } | null;
  suggestions: string[];
}
