-- Create profiles table for family members
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create elders table
CREATE TABLE public.elders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INTEGER,
  phone_number TEXT NOT NULL,
  whatsapp_number TEXT,
  emergency_contact TEXT,
  medical_conditions TEXT[],
  subscription_plan TEXT NOT NULL CHECK (subscription_plan IN ('whatsapp', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create medicines table
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  timing TEXT NOT NULL,
  purpose TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create check_ins table (logs all AI interactions)
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  check_in_type TEXT NOT NULL CHECK (check_in_type IN ('voice', 'whatsapp')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'failed')),
  conversation_summary TEXT,
  medicines_taken BOOLEAN,
  symptoms_reported TEXT[],
  well_being_score INTEGER CHECK (well_being_score >= 1 AND well_being_score <= 10),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  alert_triggered BOOLEAN DEFAULT FALSE,
  alert_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_logs table (stores full AI conversations for context)
CREATE TABLE public.conversation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id UUID NOT NULL REFERENCES public.check_ins(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ai', 'elder')),
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create health_metrics table
CREATE TABLE public.health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('blood_pressure', 'heart_rate', 'temperature', 'blood_sugar', 'weight')),
  value TEXT NOT NULL,
  status TEXT CHECK (status IN ('normal', 'warning', 'critical')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('health', 'medicine', 'emergency')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for elders (family members can only see their elders)
CREATE POLICY "Family members can view their elders"
  ON public.elders FOR SELECT
  USING (
    family_member_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage their elders"
  ON public.elders FOR ALL
  USING (
    family_member_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for medicines
CREATE POLICY "Family members can view medicines for their elders"
  ON public.medicines FOR SELECT
  USING (
    elder_id IN (
      SELECT id FROM public.elders WHERE family_member_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family members can manage medicines for their elders"
  ON public.medicines FOR ALL
  USING (
    elder_id IN (
      SELECT id FROM public.elders WHERE family_member_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for check_ins
CREATE POLICY "Family members can view check-ins for their elders"
  ON public.check_ins FOR SELECT
  USING (
    elder_id IN (
      SELECT id FROM public.elders WHERE family_member_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for conversation_logs
CREATE POLICY "Family members can view conversations for their elders"
  ON public.conversation_logs FOR SELECT
  USING (
    check_in_id IN (
      SELECT id FROM public.check_ins WHERE elder_id IN (
        SELECT id FROM public.elders WHERE family_member_id IN (
          SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- RLS Policies for health_metrics
CREATE POLICY "Family members can view health metrics for their elders"
  ON public.health_metrics FOR SELECT
  USING (
    elder_id IN (
      SELECT id FROM public.elders WHERE family_member_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family members can add health metrics for their elders"
  ON public.health_metrics FOR INSERT
  WITH CHECK (
    elder_id IN (
      SELECT id FROM public.elders WHERE family_member_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for alerts
CREATE POLICY "Family members can view alerts for their elders"
  ON public.alerts FOR SELECT
  USING (
    elder_id IN (
      SELECT id FROM public.elders WHERE family_member_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family members can update alerts for their elders"
  ON public.alerts FOR UPDATE
  USING (
    elder_id IN (
      SELECT id FROM public.elders WHERE family_member_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elders_updated_at
  BEFORE UPDATE ON public.elders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
