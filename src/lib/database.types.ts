export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          extensions?: Json
          variables?: Json
          query?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          coach_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          runner_id: string
          title: string | null
          training_plan_id: string | null
          updated_at: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          runner_id: string
          title?: string | null
          training_plan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          runner_id?: string
          title?: string | null
          training_plan_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      message_workout_links: {
        Row: {
          created_at: string | null
          id: string
          link_type: string | null
          message_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link_type?: string | null
          message_id: string
          workout_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link_type?: string | null
          message_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_workout_links_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_workout_links_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          context_type: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          read: boolean | null
          recipient_id: string
          sender_id: string
          workout_id: string | null
        }
        Insert: {
          content: string
          context_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id: string
          sender_id: string
          workout_id?: string | null
        }
        Update: {
          content?: string
          context_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id?: string
          sender_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_phases: {
        Row: {
          completed: boolean | null
          created_at: string | null
          end_date: string | null
          id: string
          notes: string | null
          phase_id: string | null
          phase_order: number
          start_date: string
          target_weekly_miles: number | null
          training_plan_id: string | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          phase_id?: string | null
          phase_order: number
          start_date: string
          target_weekly_miles?: number | null
          training_plan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          phase_id?: string | null
          phase_order?: number
          start_date?: string
          target_weekly_miles?: number | null
          training_plan_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_phases_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "training_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_phases_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          distance_type: string
          duration_weeks: number
          id: string
          is_public: boolean | null
          min_base_miles: number | null
          name: string
          peak_weekly_miles: number | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          distance_type: string
          duration_weeks: number
          id?: string
          is_public?: boolean | null
          min_base_miles?: number | null
          name: string
          peak_weekly_miles?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          distance_type?: string
          duration_weeks?: number
          id?: string
          is_public?: boolean | null
          min_base_miles?: number | null
          name?: string
          peak_weekly_miles?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      races: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          distance_miles: number | null
          distance_type: string | null
          elevation_gain_feet: number | null
          id: string
          location: string | null
          name: string
          notes: string | null
          terrain_type: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          distance_miles?: number | null
          distance_type?: string | null
          elevation_gain_feet?: number | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          terrain_type?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          distance_miles?: number | null
          distance_type?: string | null
          elevation_gain_feet?: number | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          terrain_type?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "races_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_phases: {
        Row: {
          description: string | null
          duration_weeks: number
          id: string
          phase_id: string | null
          phase_order: number
          target_weekly_miles: number | null
          template_id: string | null
        }
        Insert: {
          description?: string | null
          duration_weeks: number
          id?: string
          phase_id?: string | null
          phase_order: number
          target_weekly_miles?: number | null
          template_id?: string | null
        }
        Update: {
          description?: string | null
          duration_weeks?: number
          id?: string
          phase_id?: string | null
          phase_order?: number
          target_weekly_miles?: number | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_phases_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "training_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_phases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      training_phases: {
        Row: {
          created_at: string | null
          description: string | null
          focus_areas: string[] | null
          id: string
          name: string
          phase_order: number
          typical_duration_weeks: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          focus_areas?: string[] | null
          id?: string
          name: string
          phase_order: number
          typical_duration_weeks?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          focus_areas?: string[] | null
          id?: string
          name?: string
          phase_order?: number
          typical_duration_weeks?: number | null
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          coach_id: string
          created_at: string | null
          current_phase_id: string | null
          description: string | null
          end_date: string | null
          goal_time_hours: number | null
          goal_type: string | null
          id: string
          next_plan_id: string | null
          peak_weekly_miles: number | null
          phase_start_date: string | null
          plan_type: string | null
          previous_plan_id: string | null
          race_id: string | null
          runner_id: string
          start_date: string | null
          status: string | null
          target_race_date: string | null
          target_race_distance: string | null
          title: string
          total_weeks: number | null
          updated_at: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          current_phase_id?: string | null
          description?: string | null
          end_date?: string | null
          goal_time_hours?: number | null
          goal_type?: string | null
          id?: string
          next_plan_id?: string | null
          peak_weekly_miles?: number | null
          phase_start_date?: string | null
          plan_type?: string | null
          previous_plan_id?: string | null
          race_id?: string | null
          runner_id: string
          start_date?: string | null
          status?: string | null
          target_race_date?: string | null
          target_race_distance?: string | null
          title: string
          total_weeks?: number | null
          updated_at?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          current_phase_id?: string | null
          description?: string | null
          end_date?: string | null
          goal_time_hours?: number | null
          goal_type?: string | null
          id?: string
          next_plan_id?: string | null
          peak_weekly_miles?: number | null
          phase_start_date?: string | null
          plan_type?: string | null
          previous_plan_id?: string | null
          race_id?: string | null
          runner_id?: string
          start_date?: string | null
          status?: string | null
          target_race_date?: string | null
          target_race_distance?: string | null
          title?: string
          total_weeks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_current_phase_id_fkey"
            columns: ["current_phase_id"]
            isOneToOne: false
            referencedRelation: "training_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_next_plan_id_fkey"
            columns: ["next_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          password_hash: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          password_hash: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          password_hash?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          actual_distance: number | null
          actual_duration: number | null
          actual_type: string | null
          coach_feedback: string | null
          completed_with_group: boolean | null
          created_at: string | null
          date: string
          effort_level: number | null
          elevation_gain_feet: number | null
          id: string
          injury_notes: string | null
          intensity_level: number | null
          phase_id: string | null
          planned_distance: number | null
          planned_duration: number | null
          planned_type: string | null
          status: string
          terrain_type: string | null
          training_plan_id: string
          updated_at: string | null
          weather_conditions: string | null
          workout_category: string | null
          workout_notes: string | null
        }
        Insert: {
          actual_distance?: number | null
          actual_duration?: number | null
          actual_type?: string | null
          coach_feedback?: string | null
          completed_with_group?: boolean | null
          created_at?: string | null
          date: string
          effort_level?: number | null
          elevation_gain_feet?: number | null
          id?: string
          injury_notes?: string | null
          intensity_level?: number | null
          phase_id?: string | null
          planned_distance?: number | null
          planned_duration?: number | null
          planned_type?: string | null
          status?: string
          terrain_type?: string | null
          training_plan_id: string
          updated_at?: string | null
          weather_conditions?: string | null
          workout_category?: string | null
          workout_notes?: string | null
        }
        Update: {
          actual_distance?: number | null
          actual_duration?: number | null
          actual_type?: string | null
          coach_feedback?: string | null
          completed_with_group?: boolean | null
          created_at?: string | null
          date?: string
          effort_level?: number | null
          elevation_gain_feet?: number | null
          id?: string
          injury_notes?: string | null
          intensity_level?: number | null
          phase_id?: string | null
          planned_distance?: number | null
          planned_duration?: number | null
          planned_type?: string | null
          status?: string
          terrain_type?: string | null
          training_plan_id?: string
          updated_at?: string | null
          weather_conditions?: string | null
          workout_category?: string | null
          workout_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "training_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          p_user_id: string
          p_message: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      get_messages_for_workout: {
        Args: { workout_id: string }
        Returns: {
          sender_name: string
          created_at: string
          content: string
          link_type: string
          context_type: string
          message_id: string
        }[]
      }
      get_workout_context_for_message: {
        Args: { message_id: string }
        Returns: {
          workout_id: string
          link_type: string
          status: string
          planned_distance: number
          planned_type: string
          workout_date: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

