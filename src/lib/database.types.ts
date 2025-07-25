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
      better_auth_accounts: {
        Row: {
          access_token: string | null
          account_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          id_token: string | null
          password: string | null
          provider_id: string
          refresh_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id: string
          created_at?: string | null
          expires_at?: string | null
          id: string
          id_token?: string | null
          password?: string | null
          provider_id: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          id_token?: string | null
          password?: string | null
          provider_id?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "better_auth_accounts_user_id_better_auth_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
            referencedColumns: ["id"]
          },
        ]
      }
      better_auth_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          token: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id: string
          ip_address?: string | null
          token: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          token?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "better_auth_sessions_user_id_better_auth_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
            referencedColumns: ["id"]
          },
        ]
      }
      better_auth_users: {
        Row: {
          created_at: string | null
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          image: string | null
          name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          image?: string | null
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          image?: string | null
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      better_auth_verification_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          identifier: string
          token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id: string
          identifier: string
          token: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          identifier?: string
          token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          title: string | null
          training_plan_id: string | null
          updated_at: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          title?: string | null
          training_plan_id?: string | null
          updated_at?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          title?: string | null
          training_plan_id?: string | null
          updated_at?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_training_plan_id_training_plans_id_fk"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user1_id_better_auth_users_id_fk"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user2_id_better_auth_users_id_fk"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
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
            foreignKeyName: "message_workout_links_message_id_messages_id_fk"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_workout_links_workout_id_workouts_id_fk"
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
          conversation_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          recipient_id: string
          sender_id: string
          updated_at: string | null
          workout_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          recipient_id: string
          sender_id: string
          updated_at?: string | null
          workout_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_conversations_id_fk"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_better_auth_users_id_fk"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_better_auth_users_id_fk"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workout_id_workouts_id_fk"
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
          is_read: boolean | null
          message: string
          related_id: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_better_auth_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
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
            foreignKeyName: "plan_templates_created_by_better_auth_users_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
            referencedColumns: ["id"]
          },
        ]
      }
      races: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string | null
          distance_miles: number
          distance_type: string
          elevation_gain_feet: number | null
          id: string
          location: string
          name: string
          notes: string | null
          terrain_type: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          distance_miles: number
          distance_type: string
          elevation_gain_feet?: number | null
          id?: string
          location: string
          name: string
          notes?: string | null
          terrain_type?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          distance_miles?: number
          distance_type?: string
          elevation_gain_feet?: number | null
          id?: string
          location?: string
          name?: string
          notes?: string | null
          terrain_type?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "races_created_by_better_auth_users_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_phases: {
        Row: {
          created_at: string | null
          description: string | null
          duration_weeks: number
          id: string
          phase_id: string
          phase_order: number
          target_weekly_miles: number | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_weeks: number
          id?: string
          phase_id: string
          phase_order: number
          target_weekly_miles?: number | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_weeks?: number
          id?: string
          phase_id?: string
          phase_order?: number
          target_weekly_miles?: number | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_phases_phase_id_training_phases_id_fk"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "training_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_phases_template_id_plan_templates_id_fk"
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
          phase_order: number | null
          typical_duration_weeks: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          focus_areas?: string[] | null
          id?: string
          name: string
          phase_order?: number | null
          typical_duration_weeks?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          focus_areas?: string[] | null
          id?: string
          name?: string
          phase_order?: number | null
          typical_duration_weeks?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          archived: boolean | null
          coach_id: string
          created_at: string | null
          description: string | null
          goal_type: string | null
          id: string
          plan_type: string | null
          runner_id: string
          target_race_date: string | null
          target_race_distance: string | null
          target_time: unknown | null
          title: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          coach_id: string
          created_at?: string | null
          description?: string | null
          goal_type?: string | null
          id?: string
          plan_type?: string | null
          runner_id: string
          target_race_date?: string | null
          target_race_distance?: string | null
          target_time?: unknown | null
          title: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          coach_id?: string
          created_at?: string | null
          description?: string | null
          goal_type?: string | null
          id?: string
          plan_type?: string | null
          runner_id?: string
          target_race_date?: string | null
          target_race_distance?: string | null
          target_time?: unknown | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_coach_id_better_auth_users_id_fk"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_runner_id_better_auth_users_id_fk"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          actual_distance: number | null
          actual_duration: unknown | null
          actual_type: string | null
          coach_feedback: string | null
          created_at: string | null
          date: string
          description: string | null
          elevation_gain: number | null
          id: string
          injury_notes: string | null
          intensity: number | null
          planned_distance: number | null
          planned_duration: unknown | null
          planned_type: string | null
          status: string
          terrain_type: string | null
          title: string | null
          training_plan_id: string
          updated_at: string | null
          user_id: string
          workout_notes: string | null
        }
        Insert: {
          actual_distance?: number | null
          actual_duration?: unknown | null
          actual_type?: string | null
          coach_feedback?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          elevation_gain?: number | null
          id?: string
          injury_notes?: string | null
          intensity?: number | null
          planned_distance?: number | null
          planned_duration?: unknown | null
          planned_type?: string | null
          status?: string
          terrain_type?: string | null
          title?: string | null
          training_plan_id: string
          updated_at?: string | null
          user_id: string
          workout_notes?: string | null
        }
        Update: {
          actual_distance?: number | null
          actual_duration?: unknown | null
          actual_type?: string | null
          coach_feedback?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          elevation_gain?: number | null
          id?: string
          injury_notes?: string | null
          intensity?: number | null
          planned_distance?: number | null
          planned_duration?: unknown | null
          planned_type?: string | null
          status?: string
          terrain_type?: string | null
          title?: string | null
          training_plan_id?: string
          updated_at?: string | null
          user_id?: string
          workout_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_training_plan_id_training_plans_id_fk"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_user_id_better_auth_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "better_auth_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _name: string; _bucket_id: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; owner: string; name: string }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          next_token?: string
          start_after?: string
          delimiter_param: string
          max_keys?: number
          prefix_param: string
          bucket_id: string
        }
        Returns: {
          metadata: Json
          id: string
          name: string
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
          name: string
          id: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          sortorder?: string
          sortcolumn?: string
          search?: string
          offsets?: number
          levels?: number
          limits?: number
          bucketname: string
          prefix: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v1_optimised: {
        Args: {
          levels?: number
          prefix: string
          bucketname: string
          limits?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v2: {
        Args: {
          levels?: number
          start_after?: string
          prefix: string
          bucket_name: string
          limits?: number
        }
        Returns: {
          key: string
          metadata: Json
          id: string
          updated_at: string
          created_at: string
          name: string
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
  storage: {
    Enums: {},
  },
} as const

