-- Create call_attempts table to track call retry logic
CREATE TABLE public.call_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elder_id UUID NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.check_in_schedules(id) ON DELETE SET NULL,
  call_type TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'retry', 'emergency'
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'initiated', -- 'initiated', 'answered', 'no_answer', 'busy', 'failed'
  execution_id TEXT, -- Bolna execution ID
  initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE, -- When to retry if no answer
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 2, -- max retries before giving up
  notification_sent BOOLEAN DEFAULT FALSE, -- whether caregiver was notified
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Family members can view call attempts for their elders"
ON public.call_attempts
FOR SELECT
USING (elder_id IN (
  SELECT elders.id FROM elders
  WHERE elders.family_member_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  )
));

-- Service can insert/update call attempts
CREATE POLICY "Service can insert call attempts"
ON public.call_attempts
FOR INSERT
WITH CHECK (elder_id IN (SELECT id FROM elders));

CREATE POLICY "Service can update call attempts"
ON public.call_attempts
FOR UPDATE
USING (elder_id IN (SELECT id FROM elders));

-- Create index for efficient querying
CREATE INDEX idx_call_attempts_elder_status ON public.call_attempts(elder_id, status);
CREATE INDEX idx_call_attempts_next_retry ON public.call_attempts(next_retry_at) WHERE status = 'no_answer' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_call_attempts_execution_id ON public.call_attempts(execution_id);

-- Create trigger for updated_at
CREATE TRIGGER update_call_attempts_updated_at
BEFORE UPDATE ON public.call_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();