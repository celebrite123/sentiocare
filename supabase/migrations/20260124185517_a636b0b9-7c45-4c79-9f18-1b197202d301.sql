-- Enable realtime for b2b_alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.b2b_alerts;

-- Add better index for 48hr checks
CREATE INDEX IF NOT EXISTS idx_discharged_patients_48hr_check 
ON public.discharged_patients (check_48hr_scheduled_at, check_48hr_completed, status)
WHERE check_48hr_completed = false AND status = 'active';

-- Add index for medicine reminders
CREATE INDEX IF NOT EXISTS idx_discharged_patients_medicine_reminders
ON public.discharged_patients (discharge_date, medicine_reminders_enabled, status)
WHERE medicine_reminders_enabled = true AND status = 'active';

-- Add index for organization alerts
CREATE INDEX IF NOT EXISTS idx_b2b_alerts_org_pending
ON public.b2b_alerts (organization_id, resolved, created_at DESC)
WHERE resolved = false;