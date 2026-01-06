-- Add caregiver fields to notification_settings
ALTER TABLE public.notification_settings 
  ADD COLUMN IF NOT EXISTS caregiver_name TEXT,
  ADD COLUMN IF NOT EXISTS caregiver_phone TEXT,
  ADD COLUMN IF NOT EXISTS caregiver_relation TEXT,
  ADD COLUMN IF NOT EXISTS notify_sms BOOLEAN DEFAULT false;

-- Add last_manual_call_at to elders for call cooldown
ALTER TABLE public.elders 
  ADD COLUMN IF NOT EXISTS last_manual_call_at TIMESTAMPTZ;