export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string
          elder_id: string
          id: string
          resolved: boolean | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description: string
          elder_id: string
          id?: string
          resolved?: boolean | null
          severity: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string
          elder_id?: string
          id?: string
          resolved?: boolean | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      call_attempts: {
        Row: {
          attempt_number: number
          call_type: string
          completed_at: string | null
          created_at: string
          elder_id: string
          execution_id: string | null
          id: string
          initiated_at: string
          max_retries: number
          next_retry_at: string | null
          notification_sent: boolean | null
          retry_count: number
          schedule_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_number?: number
          call_type?: string
          completed_at?: string | null
          created_at?: string
          elder_id: string
          execution_id?: string | null
          id?: string
          initiated_at?: string
          max_retries?: number
          next_retry_at?: string | null
          notification_sent?: boolean | null
          retry_count?: number
          schedule_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_number?: number
          call_type?: string
          completed_at?: string | null
          created_at?: string
          elder_id?: string
          execution_id?: string | null
          id?: string
          initiated_at?: string
          max_retries?: number
          next_retry_at?: string | null
          notification_sent?: boolean | null
          retry_count?: number
          schedule_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_attempts_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "check_in_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      check_in_schedules: {
        Row: {
          active: boolean | null
          created_at: string | null
          days_of_week: number[] | null
          elder_id: string
          id: string
          last_run_at: string | null
          schedule_type: string
          time_of_day: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          days_of_week?: number[] | null
          elder_id: string
          id?: string
          last_run_at?: string | null
          schedule_type: string
          time_of_day?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          days_of_week?: number[] | null
          elder_id?: string
          id?: string
          last_run_at?: string | null
          schedule_type?: string
          time_of_day?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_in_schedules_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          alert_reason: string | null
          alert_triggered: boolean | null
          check_in_type: string
          conversation_summary: string | null
          created_at: string | null
          elder_id: string
          id: string
          medicines_taken: boolean | null
          recording_url: string | null
          sentiment: string | null
          status: string
          symptoms_reported: string[] | null
          well_being_score: number | null
        }
        Insert: {
          alert_reason?: string | null
          alert_triggered?: boolean | null
          check_in_type: string
          conversation_summary?: string | null
          created_at?: string | null
          elder_id: string
          id?: string
          medicines_taken?: boolean | null
          recording_url?: string | null
          sentiment?: string | null
          status: string
          symptoms_reported?: string[] | null
          well_being_score?: number | null
        }
        Update: {
          alert_reason?: string | null
          alert_triggered?: boolean | null
          check_in_type?: string
          conversation_summary?: string | null
          created_at?: string | null
          elder_id?: string
          id?: string
          medicines_taken?: boolean | null
          recording_url?: string | null
          sentiment?: string | null
          status?: string
          symptoms_reported?: string[] | null
          well_being_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_logs: {
        Row: {
          check_in_id: string
          id: string
          message: string
          role: string
          timestamp: string | null
        }
        Insert: {
          check_in_id: string
          id?: string
          message: string
          role: string
          timestamp?: string | null
        }
        Update: {
          check_in_id?: string
          id?: string
          message?: string
          role?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_logs_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
        ]
      }
      elder_access: {
        Row: {
          created_at: string | null
          elder_id: string
          id: string
          invite_status: string | null
          invited_email: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          elder_id: string
          id?: string
          invite_status?: string | null
          invited_email?: string | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          elder_id?: string
          id?: string
          invite_status?: string | null
          invited_email?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elder_access_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      elders: {
        Row: {
          age: number | null
          check_in_method: string
          created_at: string | null
          emergency_contact: string | null
          family_member_id: string
          full_name: string
          id: string
          last_manual_call_at: string | null
          medical_conditions: string[] | null
          phone_number: string
          preferred_language: string
          subscription_plan: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          age?: number | null
          check_in_method?: string
          created_at?: string | null
          emergency_contact?: string | null
          family_member_id: string
          full_name: string
          id?: string
          last_manual_call_at?: string | null
          medical_conditions?: string[] | null
          phone_number: string
          preferred_language?: string
          subscription_plan: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          age?: number | null
          check_in_method?: string
          created_at?: string | null
          emergency_contact?: string | null
          family_member_id?: string
          full_name?: string
          id?: string
          last_manual_call_at?: string | null
          medical_conditions?: string[] | null
          phone_number?: string
          preferred_language?: string
          subscription_plan?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elders_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_metrics: {
        Row: {
          elder_id: string
          id: string
          metric_type: string
          recorded_at: string | null
          status: string | null
          value: string
        }
        Insert: {
          elder_id: string
          id?: string
          metric_type: string
          recorded_at?: string | null
          status?: string | null
          value: string
        }
        Update: {
          elder_id?: string
          id?: string
          metric_type?: string
          recorded_at?: string | null
          status?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          active: boolean | null
          created_at: string | null
          dosage: string
          elder_id: string
          frequency: string
          id: string
          name: string
          purpose: string | null
          timing: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          dosage: string
          elder_id: string
          frequency: string
          id?: string
          name: string
          purpose?: string | null
          timing: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          dosage?: string
          elder_id?: string
          frequency?: string
          id?: string
          name?: string
          purpose?: string | null
          timing?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicines_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          caregiver_name: string | null
          caregiver_phone: string | null
          caregiver_relation: string | null
          created_at: string | null
          elder_id: string
          email_address: string | null
          id: string
          notify_email: boolean | null
          notify_on_alert: boolean | null
          notify_on_low_wellbeing: boolean | null
          notify_on_missed_checkin: boolean | null
          notify_sms: boolean | null
          updated_at: string | null
          weekly_summary_enabled: boolean | null
          wellbeing_threshold: number | null
        }
        Insert: {
          caregiver_name?: string | null
          caregiver_phone?: string | null
          caregiver_relation?: string | null
          created_at?: string | null
          elder_id: string
          email_address?: string | null
          id?: string
          notify_email?: boolean | null
          notify_on_alert?: boolean | null
          notify_on_low_wellbeing?: boolean | null
          notify_on_missed_checkin?: boolean | null
          notify_sms?: boolean | null
          updated_at?: string | null
          weekly_summary_enabled?: boolean | null
          wellbeing_threshold?: number | null
        }
        Update: {
          caregiver_name?: string | null
          caregiver_phone?: string | null
          caregiver_relation?: string | null
          created_at?: string | null
          elder_id?: string
          email_address?: string | null
          id?: string
          notify_email?: boolean | null
          notify_on_alert?: boolean | null
          notify_on_low_wellbeing?: boolean | null
          notify_on_missed_checkin?: boolean | null
          notify_sms?: boolean | null
          updated_at?: string | null
          weekly_summary_enabled?: boolean | null
          wellbeing_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: true
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          api_calls_reset_at: string | null
          created_at: string | null
          emergency_calls_reset_at: string | null
          full_name: string
          id: string
          monthly_api_calls_used: number | null
          monthly_emergency_calls_used: number | null
          phone_number: string | null
          privacy_accepted_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          terms_accepted_at: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_calls_reset_at?: string | null
          created_at?: string | null
          emergency_calls_reset_at?: string | null
          full_name: string
          id?: string
          monthly_api_calls_used?: number | null
          monthly_emergency_calls_used?: number | null
          phone_number?: string | null
          privacy_accepted_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_calls_reset_at?: string | null
          created_at?: string | null
          emergency_calls_reset_at?: string | null
          full_name?: string
          id?: string
          monthly_api_calls_used?: number | null
          monthly_emergency_calls_used?: number | null
          phone_number?: string | null
          privacy_accepted_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resolved_symptoms: {
        Row: {
          created_at: string
          elder_id: string
          id: string
          reported_at: string
          resolution_note: string | null
          resolved_at: string
          symptom: string
        }
        Insert: {
          created_at?: string
          elder_id: string
          id?: string
          reported_at?: string
          resolution_note?: string | null
          resolved_at?: string
          symptom: string
        }
        Update: {
          created_at?: string
          elder_id?: string
          id?: string
          reported_at?: string
          resolution_note?: string | null
          resolved_at?: string
          symptom?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolved_symptoms_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          check_in_id: string | null
          created_at: string
          elder_id: string
          ended_at: string | null
          id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          check_in_id?: string | null
          created_at?: string
          elder_id: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          check_in_id?: string | null
          created_at?: string
          elder_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          twilio_sid: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          twilio_sid?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
