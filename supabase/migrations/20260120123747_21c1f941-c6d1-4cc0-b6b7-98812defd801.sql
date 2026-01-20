-- ============================================================
-- SECURITY HARDENING: Fix RLS Vulnerabilities
-- ============================================================

-- 1. CRITICAL: Revoke anonymous access from sensitive tables
-- This explicitly prevents any unauthenticated access

-- Revoke anon from b2b_leads (protects business contact info)
REVOKE ALL ON public.b2b_leads FROM anon;

-- Revoke anon from elders (protects personal health info)
REVOKE ALL ON public.elders FROM anon;

-- Revoke anon from check_ins (protects health records)
REVOKE ALL ON public.check_ins FROM anon;

-- Revoke anon from health_metrics (protects health data)
REVOKE ALL ON public.health_metrics FROM anon;

-- Revoke anon from conversation_logs (protects transcripts)
REVOKE ALL ON public.conversation_logs FROM anon;

-- Revoke anon from whatsapp_conversations (protects conversations)
REVOKE ALL ON public.whatsapp_conversations FROM anon;

-- Revoke anon from whatsapp_messages (protects messages)
REVOKE ALL ON public.whatsapp_messages FROM anon;

-- Revoke anon from alerts (protects health alerts)
REVOKE ALL ON public.alerts FROM anon;

-- Revoke anon from medicines (protects medication info)
REVOKE ALL ON public.medicines FROM anon;

-- Revoke anon from notification_settings (protects contact info)
REVOKE ALL ON public.notification_settings FROM anon;

-- Revoke anon from check_in_schedules (protects schedules)
REVOKE ALL ON public.check_in_schedules FROM anon;

-- Revoke anon from call_attempts (protects call history)
REVOKE ALL ON public.call_attempts FROM anon;

-- Revoke anon from resolved_symptoms (protects health history)
REVOKE ALL ON public.resolved_symptoms FROM anon;

-- Revoke anon from elder_access (protects access management)
REVOKE ALL ON public.elder_access FROM anon;

-- Revoke anon from profiles (protects user data)
REVOKE ALL ON public.profiles FROM anon;

-- Revoke anon from payment_history (protects payment info)
REVOKE ALL ON public.payment_history FROM anon;

-- Revoke anon from payment_methods (protects payment methods)
REVOKE ALL ON public.payment_methods FROM anon;

-- Revoke anon from renewal_reminders (protects subscription info)
REVOKE ALL ON public.renewal_reminders FROM anon;

-- Revoke anon from user_roles (protects role info)
REVOKE ALL ON public.user_roles FROM anon;

-- 2. WARN: Add INSERT denial for check_ins to authenticated users
-- Only service role (edge functions) should insert check-ins
CREATE POLICY "Deny authenticated inserts to check_ins"
  ON public.check_ins
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- 3. WARN: Add INSERT denial for health_metrics by direct authenticated users
-- Family members can add metrics, but this policy exists - verify service can insert
-- Actually family members CAN add metrics per existing policy, so we keep that

-- 4. WARN: Fix elder_access - owners already have "Owners can manage elder access" 
-- which covers ALL operations. The existing setup is actually correct.
-- The issue was about visibility - owners CAN already see all access via the ALL policy.

-- 5. Ensure b2b_leads INSERT only works for basic validation (anon already revoked)
-- The existing "Rate limited B2B inquiries" policy validates input structure
-- But since anon is revoked, we need to grant limited INSERT back for the form
GRANT INSERT ON public.b2b_leads TO anon;

-- 6. Add explicit anon denial policies as defense in depth for key tables
-- This adds RLS-level denial in addition to permission revocation

-- Note: We don't need separate anon denial policies because REVOKE ALL 
-- already prevents anon from accessing these tables at the permission level

-- 7. Create a public-facing B2B lead submission function that validates and inserts
-- This allows the contact form to work while keeping the table protected
CREATE OR REPLACE FUNCTION public.submit_b2b_lead(
  p_organization_name TEXT,
  p_organization_type TEXT,
  p_contact_name TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_expected_residents INTEGER DEFAULT NULL,
  p_preferred_call_frequency INTEGER DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Validate inputs
  IF length(p_organization_name) < 2 OR length(p_organization_name) > 200 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid organization name');
  END IF;
  
  IF p_organization_type NOT IN ('hospital', 'nursing_home', 'assisted_living', 'home_care', 'other') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid organization type');
  END IF;
  
  IF length(p_contact_name) < 2 OR length(p_contact_name) > 100 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid contact name');
  END IF;
  
  IF length(p_contact_email) < 5 OR length(p_contact_email) > 255 OR 
     p_contact_email NOT LIKE '%@%.%' THEN
    RETURN json_build_object('success', false, 'error', 'Invalid email address');
  END IF;
  
  IF length(p_contact_phone) < 10 OR length(p_contact_phone) > 15 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid phone number');
  END IF;
  
  IF p_expected_residents IS NOT NULL AND (p_expected_residents < 1 OR p_expected_residents > 10000) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid expected residents');
  END IF;
  
  IF p_preferred_call_frequency IS NOT NULL AND 
     p_preferred_call_frequency NOT IN (7, 14, 30) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid call frequency');
  END IF;
  
  IF p_message IS NOT NULL AND length(p_message) > 2000 THEN
    RETURN json_build_object('success', false, 'error', 'Message too long');
  END IF;

  -- Insert the lead
  INSERT INTO public.b2b_leads (
    organization_name,
    organization_type,
    contact_name,
    contact_email,
    contact_phone,
    expected_residents,
    preferred_call_frequency,
    message,
    status
  ) VALUES (
    p_organization_name,
    p_organization_type,
    p_contact_name,
    p_contact_email,
    p_contact_phone,
    p_expected_residents,
    p_preferred_call_frequency,
    p_message,
    'new'
  );
  
  RETURN json_build_object('success', true, 'message', 'Lead submitted successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Submission failed. Please try again.');
END;
$$;

-- Revoke direct insert again after creating function
REVOKE INSERT ON public.b2b_leads FROM anon;

-- Grant execute on the function to anon (for contact form)
GRANT EXECUTE ON FUNCTION public.submit_b2b_lead TO anon;
GRANT EXECUTE ON FUNCTION public.submit_b2b_lead TO authenticated;