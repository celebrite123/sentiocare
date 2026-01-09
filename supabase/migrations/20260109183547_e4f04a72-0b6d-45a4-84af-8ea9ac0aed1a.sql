-- Add emergency call usage tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS monthly_emergency_calls_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS emergency_calls_reset_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS monthly_api_calls_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS api_calls_reset_at timestamp with time zone DEFAULT now();

-- Comment for clarity
COMMENT ON COLUMN public.profiles.monthly_emergency_calls_used IS 'Number of emergency calls used this month (max 5)';
COMMENT ON COLUMN public.profiles.emergency_calls_reset_at IS 'When the emergency call counter resets';
COMMENT ON COLUMN public.profiles.monthly_api_calls_used IS 'Number of API calls (WhatsApp messages) used this month';
COMMENT ON COLUMN public.profiles.api_calls_reset_at IS 'When the API call counter resets';