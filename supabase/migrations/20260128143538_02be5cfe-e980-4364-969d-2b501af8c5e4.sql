-- Add caregiver fields to discharged_patients
ALTER TABLE discharged_patients 
  ADD COLUMN IF NOT EXISTS caregiver_name text,
  ADD COLUMN IF NOT EXISTS caregiver_phone text,
  ADD COLUMN IF NOT EXISTS caregiver_relation text;

-- Track who answered in patient_checkins
ALTER TABLE patient_checkins
  ADD COLUMN IF NOT EXISTS respondent_type text DEFAULT 'patient',
  ADD COLUMN IF NOT EXISTS respondent_name text,
  ADD COLUMN IF NOT EXISTS respondent_relation text;

-- Add index for caregiver phone lookups
CREATE INDEX IF NOT EXISTS idx_discharged_patients_caregiver_phone ON discharged_patients(caregiver_phone) WHERE caregiver_phone IS NOT NULL;