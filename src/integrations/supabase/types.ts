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
      b2b_alerts: {
        Row: {
          alert_type: string
          assigned_at: string | null
          assigned_to: string | null
          created_at: string | null
          description: string | null
          id: string
          organization_id: string
          patient_id: string
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          organization_id: string
          patient_id: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          alert_type?: string
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          patient_id?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_alerts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "discharged_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_leads: {
        Row: {
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          expected_residents: number | null
          id: string
          message: string | null
          organization_name: string
          organization_type: string
          preferred_call_frequency: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at?: string
          expected_residents?: number | null
          id?: string
          message?: string | null
          organization_name: string
          organization_type: string
          preferred_call_frequency?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          expected_residents?: number | null
          id?: string
          message?: string | null
          organization_name?: string
          organization_type?: string
          preferred_call_frequency?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
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
          monitoring_responses: Json | null
          raw_transcript: string | null
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
          monitoring_responses?: Json | null
          raw_transcript?: string | null
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
          monitoring_responses?: Json | null
          raw_transcript?: string | null
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
      discharged_patients: {
        Row: {
          batch_id: string | null
          check_48hr_attempt_count: number | null
          check_48hr_completed: boolean | null
          check_48hr_method: string | null
          check_48hr_scheduled_at: string | null
          created_at: string | null
          diagnosis: string | null
          discharge_date: string
          discharge_message_delivered: boolean | null
          discharge_message_sent: boolean | null
          discharge_message_sent_at: string | null
          discharge_message_sid: string | null
          doctor_name: string | null
          follow_up_date: string | null
          followup_confirmed: boolean | null
          followup_reminder_sent: boolean | null
          followup_reminder_sent_at: string | null
          followup_rescheduled_to: string | null
          help_request_at: string | null
          help_request_message: string | null
          help_request_resolved: boolean | null
          help_requested: boolean | null
          help_resolved_at: string | null
          help_resolved_by: string | null
          id: string
          language: string | null
          medicine_adherence: Json | null
          medicine_day_count: number | null
          medicine_list: Json | null
          medicine_reminders_enabled: boolean | null
          mobile_number: string
          nurse_assigned_at: string | null
          nurse_assigned_id: string | null
          nurse_call_at: string | null
          nurse_call_notes: string | null
          nurse_called_back: boolean | null
          organization_id: string
          patient_name: string
          red_flag_symptoms: string[] | null
          risk_reason: string | null
          risk_status: string | null
          risk_updated_at: string | null
          status: string | null
          updated_at: string | null
          ward: string | null
        }
        Insert: {
          batch_id?: string | null
          check_48hr_attempt_count?: number | null
          check_48hr_completed?: boolean | null
          check_48hr_method?: string | null
          check_48hr_scheduled_at?: string | null
          created_at?: string | null
          diagnosis?: string | null
          discharge_date: string
          discharge_message_delivered?: boolean | null
          discharge_message_sent?: boolean | null
          discharge_message_sent_at?: string | null
          discharge_message_sid?: string | null
          doctor_name?: string | null
          follow_up_date?: string | null
          followup_confirmed?: boolean | null
          followup_reminder_sent?: boolean | null
          followup_reminder_sent_at?: string | null
          followup_rescheduled_to?: string | null
          help_request_at?: string | null
          help_request_message?: string | null
          help_request_resolved?: boolean | null
          help_requested?: boolean | null
          help_resolved_at?: string | null
          help_resolved_by?: string | null
          id?: string
          language?: string | null
          medicine_adherence?: Json | null
          medicine_day_count?: number | null
          medicine_list?: Json | null
          medicine_reminders_enabled?: boolean | null
          mobile_number: string
          nurse_assigned_at?: string | null
          nurse_assigned_id?: string | null
          nurse_call_at?: string | null
          nurse_call_notes?: string | null
          nurse_called_back?: boolean | null
          organization_id: string
          patient_name: string
          red_flag_symptoms?: string[] | null
          risk_reason?: string | null
          risk_status?: string | null
          risk_updated_at?: string | null
          status?: string | null
          updated_at?: string | null
          ward?: string | null
        }
        Update: {
          batch_id?: string | null
          check_48hr_attempt_count?: number | null
          check_48hr_completed?: boolean | null
          check_48hr_method?: string | null
          check_48hr_scheduled_at?: string | null
          created_at?: string | null
          diagnosis?: string | null
          discharge_date?: string
          discharge_message_delivered?: boolean | null
          discharge_message_sent?: boolean | null
          discharge_message_sent_at?: string | null
          discharge_message_sid?: string | null
          doctor_name?: string | null
          follow_up_date?: string | null
          followup_confirmed?: boolean | null
          followup_reminder_sent?: boolean | null
          followup_reminder_sent_at?: string | null
          followup_rescheduled_to?: string | null
          help_request_at?: string | null
          help_request_message?: string | null
          help_request_resolved?: boolean | null
          help_requested?: boolean | null
          help_resolved_at?: string | null
          help_resolved_by?: string | null
          id?: string
          language?: string | null
          medicine_adherence?: Json | null
          medicine_day_count?: number | null
          medicine_list?: Json | null
          medicine_reminders_enabled?: boolean | null
          mobile_number?: string
          nurse_assigned_at?: string | null
          nurse_assigned_id?: string | null
          nurse_call_at?: string | null
          nurse_call_notes?: string | null
          nurse_called_back?: boolean | null
          organization_id?: string
          patient_name?: string
          red_flag_symptoms?: string[] | null
          risk_reason?: string | null
          risk_status?: string | null
          risk_updated_at?: string | null
          status?: string | null
          updated_at?: string | null
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discharged_patients_help_resolved_by_fkey"
            columns: ["help_resolved_by"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharged_patients_nurse_assigned_id_fkey"
            columns: ["nurse_assigned_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharged_patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          monitoring_config: Json | null
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
          monitoring_config?: Json | null
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
          monitoring_config?: Json | null
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
      organization_members: {
        Row: {
          can_manage_staff: boolean | null
          can_upload_patients: boolean | null
          can_view_reports: boolean | null
          created_at: string | null
          email: string | null
          id: string
          is_on_duty: boolean | null
          name: string
          organization_id: string
          phone: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_manage_staff?: boolean | null
          can_upload_patients?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_on_duty?: boolean | null
          name: string
          organization_id: string
          phone?: string | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_manage_staff?: boolean | null
          can_upload_patients?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_on_duty?: boolean | null
          name?: string
          organization_id?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          auto_48hr_check: boolean | null
          auto_medicine_reminders: boolean | null
          calls_used_this_month: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          default_language: string | null
          discharge_message_template: string | null
          hospital_contact_number: string | null
          id: string
          logo_url: string | null
          monthly_call_limit: number | null
          monthly_patient_limit: number | null
          monthly_sms_limit: number | null
          name: string
          patients_this_month: number | null
          sms_used_this_month: number | null
          type: string
          updated_at: string | null
          usage_reset_at: string | null
        }
        Insert: {
          address?: string | null
          auto_48hr_check?: boolean | null
          auto_medicine_reminders?: boolean | null
          calls_used_this_month?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          default_language?: string | null
          discharge_message_template?: string | null
          hospital_contact_number?: string | null
          id?: string
          logo_url?: string | null
          monthly_call_limit?: number | null
          monthly_patient_limit?: number | null
          monthly_sms_limit?: number | null
          name: string
          patients_this_month?: number | null
          sms_used_this_month?: number | null
          type?: string
          updated_at?: string | null
          usage_reset_at?: string | null
        }
        Update: {
          address?: string | null
          auto_48hr_check?: boolean | null
          auto_medicine_reminders?: boolean | null
          calls_used_this_month?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          default_language?: string | null
          discharge_message_template?: string | null
          hospital_contact_number?: string | null
          id?: string
          logo_url?: string | null
          monthly_call_limit?: number | null
          monthly_patient_limit?: number | null
          monthly_sms_limit?: number | null
          name?: string
          patients_this_month?: number | null
          sms_used_this_month?: number | null
          type?: string
          updated_at?: string | null
          usage_reset_at?: string | null
        }
        Relationships: []
      }
      patient_checkins: {
        Row: {
          ai_summary: string | null
          answered: boolean | null
          call_duration_seconds: number | null
          call_id: string | null
          checkin_type: string
          created_at: string | null
          danger_symptoms_reported: string[] | null
          id: string
          medicines_taken: boolean | null
          message_sid: string | null
          method: string
          needs_hospital_help: boolean | null
          organization_id: string
          patient_id: string
          patient_response: string | null
          recording_url: string | null
          risk_level: string | null
          risk_reason: string | null
          sentiment: string | null
        }
        Insert: {
          ai_summary?: string | null
          answered?: boolean | null
          call_duration_seconds?: number | null
          call_id?: string | null
          checkin_type: string
          created_at?: string | null
          danger_symptoms_reported?: string[] | null
          id?: string
          medicines_taken?: boolean | null
          message_sid?: string | null
          method: string
          needs_hospital_help?: boolean | null
          organization_id: string
          patient_id: string
          patient_response?: string | null
          recording_url?: string | null
          risk_level?: string | null
          risk_reason?: string | null
          sentiment?: string | null
        }
        Update: {
          ai_summary?: string | null
          answered?: boolean | null
          call_duration_seconds?: number | null
          call_id?: string | null
          checkin_type?: string
          created_at?: string | null
          danger_symptoms_reported?: string[] | null
          id?: string
          medicines_taken?: boolean | null
          message_sid?: string | null
          method?: string
          needs_hospital_help?: boolean | null
          organization_id?: string
          patient_id?: string
          patient_response?: string | null
          recording_url?: string | null
          risk_level?: string | null
          risk_reason?: string | null
          sentiment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_checkins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_checkins_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "discharged_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_communications: {
        Row: {
          call_duration_seconds: number | null
          channel: string
          content: string
          created_at: string | null
          delivered_at: string | null
          direction: string
          id: string
          message_sid: string | null
          organization_id: string
          patient_id: string
          read_at: string | null
          status: string | null
        }
        Insert: {
          call_duration_seconds?: number | null
          channel: string
          content: string
          created_at?: string | null
          delivered_at?: string | null
          direction: string
          id?: string
          message_sid?: string | null
          organization_id: string
          patient_id: string
          read_at?: string | null
          status?: string | null
        }
        Update: {
          call_duration_seconds?: number | null
          channel?: string
          content?: string
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          id?: string
          message_sid?: string | null
          organization_id?: string
          patient_id?: string
          read_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_communications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_communications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "discharged_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_upload_batches: {
        Row: {
          created_at: string | null
          errors: Json | null
          failed_imports: number | null
          file_name: string | null
          file_url: string | null
          id: string
          organization_id: string
          processed_at: string | null
          status: string | null
          successful_imports: number | null
          total_patients: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          errors?: Json | null
          failed_imports?: number | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          organization_id: string
          processed_at?: string | null
          status?: string | null
          successful_imports?: number | null
          total_patients?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          errors?: Json | null
          failed_imports?: number | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          organization_id?: string
          processed_at?: string | null
          status?: string | null
          successful_imports?: number | null
          total_patients?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_upload_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_upload_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          is_auto_renewal: boolean | null
          plan_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          is_auto_renewal?: boolean | null
          plan_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          is_auto_renewal?: boolean | null
          plan_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          card_last4: string | null
          card_network: string | null
          card_type: string | null
          created_at: string
          id: string
          is_default: boolean | null
          razorpay_token_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_last4?: string | null
          card_network?: string | null
          card_type?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          razorpay_token_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_last4?: string | null
          card_network?: string | null
          card_type?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          razorpay_token_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_calls_reset_at: string | null
          auto_renewal_enabled: boolean | null
          cancellation_requested_at: string | null
          created_at: string | null
          emergency_calls_reset_at: string | null
          full_name: string
          id: string
          last_payment_at: string | null
          monthly_api_calls_used: number | null
          monthly_emergency_calls_used: number | null
          phone_number: string | null
          privacy_accepted_at: string | null
          subscription_expires_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          terms_accepted_at: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_calls_reset_at?: string | null
          auto_renewal_enabled?: boolean | null
          cancellation_requested_at?: string | null
          created_at?: string | null
          emergency_calls_reset_at?: string | null
          full_name: string
          id?: string
          last_payment_at?: string | null
          monthly_api_calls_used?: number | null
          monthly_emergency_calls_used?: number | null
          phone_number?: string | null
          privacy_accepted_at?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_calls_reset_at?: string | null
          auto_renewal_enabled?: boolean | null
          cancellation_requested_at?: string | null
          created_at?: string | null
          emergency_calls_reset_at?: string | null
          full_name?: string
          id?: string
          last_payment_at?: string | null
          monthly_api_calls_used?: number | null
          monthly_emergency_calls_used?: number | null
          phone_number?: string | null
          privacy_accepted_at?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      renewal_reminders: {
        Row: {
          created_at: string
          email_sent: boolean | null
          id: string
          reminder_type: string
          sent_at: string
          subscription_expires_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean | null
          id?: string
          reminder_type: string
          sent_at?: string
          subscription_expires_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean | null
          id?: string
          reminder_type?: string
          sent_at?: string
          subscription_expires_at?: string
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
      get_user_org_id: { Args: { uid: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: { Args: { uid: string }; Returns: boolean }
      submit_b2b_lead: {
        Args: {
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_expected_residents?: number
          p_message?: string
          p_organization_name: string
          p_organization_type: string
          p_preferred_call_frequency?: number
        }
        Returns: Json
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
