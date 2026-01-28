-- Phase 3: Add columns for staff routing and callback tracking

-- Add new columns to organizations for staff routing
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS on_call_clinician_phone text,
  ADD COLUMN IF NOT EXISTS duty_nurse_phone text,
  ADD COLUMN IF NOT EXISTS care_coordinator_email text;

-- Add guaranteed callback tracking columns to scheduled_callbacks
ALTER TABLE scheduled_callbacks
  ADD COLUMN IF NOT EXISTS patient_notified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS patient_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS escalated boolean DEFAULT false;

-- Add safety check responses and compliance tracking to patient_checkins
ALTER TABLE patient_checkins
  ADD COLUMN IF NOT EXISTS safety_check_responses jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS identity_verified boolean,
  ADD COLUMN IF NOT EXISTS consent_obtained boolean;