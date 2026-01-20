-- Create B2B leads table for enterprise inquiries
CREATE TABLE public.b2b_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL CHECK (organization_type IN ('hospital', 'elder_home', 'clinic', 'other')),
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  expected_residents INTEGER,
  preferred_call_frequency INTEGER CHECK (preferred_call_frequency IN (7, 14, 30)),
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.b2b_leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert leads (public form)
CREATE POLICY "Anyone can submit B2B inquiries"
ON public.b2b_leads
FOR INSERT
WITH CHECK (true);

-- Only authenticated users with admin role can view/manage leads
CREATE POLICY "Admins can view all B2B leads"
ON public.b2b_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update B2B leads"
ON public.b2b_leads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_b2b_leads_updated_at
BEFORE UPDATE ON public.b2b_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();