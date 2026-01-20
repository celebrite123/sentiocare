-- Add cancellation_requested_at column to profiles for tracking subscription cancellations
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;