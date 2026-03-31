
ALTER TABLE public.profiles DROP CONSTRAINT profiles_subscription_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_status_check 
  CHECK (subscription_status = ANY (ARRAY['trial'::text, 'active'::text, 'expired'::text, 'waitlisted'::text]));
ALTER TABLE public.profiles ALTER COLUMN subscription_status SET DEFAULT 'waitlisted';

UPDATE public.profiles 
SET subscription_status = 'waitlisted' 
WHERE waitlist_status = 'pending' 
  AND subscription_status = 'trial'
  AND user_id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');
