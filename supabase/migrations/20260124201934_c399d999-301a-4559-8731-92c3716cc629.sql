-- Add consent field to discharged_patients
ALTER TABLE discharged_patients ADD COLUMN IF NOT EXISTS consent_given boolean DEFAULT true;

-- Add call schedule fields to discharged_patients
ALTER TABLE discharged_patients ADD COLUMN IF NOT EXISTS call_schedule jsonb DEFAULT '[{"day": 1, "completed": false}, {"day": 3, "completed": false}, {"day": 7, "completed": false}]';
ALTER TABLE discharged_patients ADD COLUMN IF NOT EXISTS next_call_due timestamptz;
ALTER TABLE discharged_patients ADD COLUMN IF NOT EXISTS last_call_date timestamptz;

-- Add escalation fields to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS escalation_phone text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS escalation_email text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_call_schedule jsonb DEFAULT '[1, 3, 7]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS data_retention_days integer DEFAULT 90;

-- Add notification tracking to b2b_alerts
ALTER TABLE b2b_alerts ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;
ALTER TABLE b2b_alerts ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;
ALTER TABLE b2b_alerts ADD COLUMN IF NOT EXISTS sla_deadline timestamptz;
ALTER TABLE b2b_alerts ADD COLUMN IF NOT EXISTS sla_breached boolean DEFAULT false;

-- Create scheduled_callbacks table for human handoff (without FK to organization_members)
CREATE TABLE IF NOT EXISTS scheduled_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES discharged_patients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  assigned_to uuid,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'missed')),
  notes text,
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on scheduled_callbacks
ALTER TABLE scheduled_callbacks ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduled_callbacks
CREATE POLICY "Org members can view callbacks"
  ON scheduled_callbacks FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can create callbacks"
  ON scheduled_callbacks FOR INSERT
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update callbacks"
  ON scheduled_callbacks FOR UPDATE
  USING (organization_id = get_user_org_id(auth.uid()));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_scheduled_callbacks_org_status 
  ON scheduled_callbacks(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_scheduled_callbacks_scheduled_for 
  ON scheduled_callbacks(scheduled_for) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_discharged_patients_next_call 
  ON discharged_patients(next_call_due) 
  WHERE status = 'active' AND consent_given = true;

-- Enable realtime for scheduled_callbacks
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_callbacks;