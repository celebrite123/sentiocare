-- Create resolved_symptoms table to track symptoms that have been resolved
CREATE TABLE public.resolved_symptoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elder_id UUID REFERENCES public.elders(id) ON DELETE CASCADE NOT NULL,
  symptom TEXT NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resolved_symptoms ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_resolved_symptoms_elder_id ON public.resolved_symptoms(elder_id);

-- RLS policies - users can view resolved symptoms for elders they have access to
CREATE POLICY "Users can view resolved symptoms for their elders"
ON public.resolved_symptoms
FOR SELECT
USING (
  elder_id IN (
    SELECT id FROM public.elders WHERE family_member_id = auth.uid()
  )
  OR
  elder_id IN (
    SELECT elder_id FROM public.elder_access WHERE user_id = auth.uid()
  )
);

-- Service role can insert/update resolved symptoms (from webhooks)
CREATE POLICY "Service role can manage resolved symptoms"
ON public.resolved_symptoms
FOR ALL
USING (true)
WITH CHECK (true);