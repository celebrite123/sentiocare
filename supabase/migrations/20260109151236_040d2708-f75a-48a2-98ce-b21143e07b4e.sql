-- Add weekly_summary_enabled to notification_settings
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS weekly_summary_enabled boolean DEFAULT true;

-- Create elder_access table for multi-family access
CREATE TABLE IF NOT EXISTS public.elder_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES elders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'caregiver', 'viewer')),
  invited_email text,
  invite_status text DEFAULT 'pending' CHECK (invite_status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(elder_id, user_id)
);

-- Enable RLS on elder_access
ALTER TABLE public.elder_access ENABLE ROW LEVEL SECURITY;

-- Policy: Owners (original family members) can manage access for their elders
CREATE POLICY "Owners can manage elder access"
ON public.elder_access
FOR ALL
USING (
  elder_id IN (
    SELECT e.id FROM elders e
    JOIN profiles p ON p.id = e.family_member_id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  elder_id IN (
    SELECT e.id FROM elders e
    JOIN profiles p ON p.id = e.family_member_id
    WHERE p.user_id = auth.uid()
  )
);

-- Policy: Users with access can view their own access records
CREATE POLICY "Users can view their own access"
ON public.elder_access
FOR SELECT
USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_elder_access_updated_at
BEFORE UPDATE ON public.elder_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();