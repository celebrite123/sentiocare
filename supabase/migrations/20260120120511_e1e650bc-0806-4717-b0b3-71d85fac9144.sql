-- Update the default trial period from 14 days to 5 days for new users
ALTER TABLE public.profiles 
ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '5 days');