-- Create table to store execution_id → patient mapping for webhook lookups
CREATE TABLE b2b_pending_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES discharged_patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  call_type TEXT DEFAULT 'health_check',
  day_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ
);

-- Index for fast lookups by execution_id
CREATE INDEX idx_pending_calls_execution ON b2b_pending_calls(execution_id);

-- Index for cleanup of old processed calls
CREATE INDEX idx_pending_calls_processed ON b2b_pending_calls(processed, created_at);

-- Enable RLS - only service role can access this table
ALTER TABLE b2b_pending_calls ENABLE ROW LEVEL SECURITY;

-- No policies = service role only access (RLS blocks all authenticated users)