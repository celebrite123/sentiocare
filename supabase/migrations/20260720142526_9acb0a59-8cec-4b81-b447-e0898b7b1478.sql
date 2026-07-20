
-- Drop overly permissive INSERT/UPDATE policies; service role bypasses RLS
DROP POLICY IF EXISTS "Service can create alerts for valid elders" ON public.alerts;
DROP POLICY IF EXISTS "Service can create alerts" ON public.b2b_alerts;
DROP POLICY IF EXISTS "Service can insert call attempts" ON public.call_attempts;
DROP POLICY IF EXISTS "Service can update call attempts" ON public.call_attempts;
DROP POLICY IF EXISTS "Service can create patient checkins" ON public.patient_checkins;
DROP POLICY IF EXISTS "Service can create patient communications" ON public.patient_communications;
DROP POLICY IF EXISTS "Service can create resolved symptoms for valid elders" ON public.resolved_symptoms;

-- Revoke EXECUTE on internal SECURITY DEFINER helpers from public/anon/authenticated.
-- These are only used inside RLS policies (which run with definer rights), so revoking direct execute is safe.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_org_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Restrict public storage buckets so anonymous users cannot list all files.
-- Public URLs continue to work because the /storage/v1/object/public/... path bypasses RLS.
DROP POLICY IF EXISTS "Anyone can view blog images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read demo audio" ON storage.objects;
