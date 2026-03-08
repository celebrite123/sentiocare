ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS waitlist_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS waitlist_approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS waitlist_approved_by uuid;