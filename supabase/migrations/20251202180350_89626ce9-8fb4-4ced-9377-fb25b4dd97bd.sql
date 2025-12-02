-- Table for check-in schedules
CREATE TABLE public.check_in_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elder_id UUID NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly')),
  time_of_day TIME NOT NULL DEFAULT '09:00',
  days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,0}', -- 0=Sunday, 1=Monday, etc.
  active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for notification settings
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elder_id UUID NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  notify_email BOOLEAN DEFAULT true,
  email_address TEXT,
  notify_on_alert BOOLEAN DEFAULT true,
  notify_on_low_wellbeing BOOLEAN DEFAULT true,
  wellbeing_threshold INTEGER DEFAULT 5,
  notify_on_missed_checkin BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(elder_id)
);

-- Enable RLS
ALTER TABLE public.check_in_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for check_in_schedules
CREATE POLICY "Family members can manage schedules for their elders"
ON public.check_in_schedules
FOR ALL
TO authenticated
USING (elder_id IN (
  SELECT id FROM elders WHERE family_member_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
))
WITH CHECK (elder_id IN (
  SELECT id FROM elders WHERE family_member_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
));

-- RLS policies for notification_settings
CREATE POLICY "Family members can manage notifications for their elders"
ON public.notification_settings
FOR ALL
TO authenticated
USING (elder_id IN (
  SELECT id FROM elders WHERE family_member_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
))
WITH CHECK (elder_id IN (
  SELECT id FROM elders WHERE family_member_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
));

-- Trigger for updated_at
CREATE TRIGGER update_check_in_schedules_updated_at
BEFORE UPDATE ON public.check_in_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();