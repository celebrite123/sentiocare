-- Fix the update_updated_at_column function to have an immutable search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix the overly permissive RLS policy on resolved_symptoms table
-- Drop the policy that uses USING (true) and WITH CHECK (true)
DROP POLICY IF EXISTS "Service role can manage resolved symptoms" ON public.resolved_symptoms;

-- Create a proper INSERT policy for service-level inserts that validates elder_id
CREATE POLICY "Service can create resolved symptoms for valid elders"
ON public.resolved_symptoms FOR INSERT
TO authenticated, anon
WITH CHECK (elder_id IN (SELECT id FROM public.elders));

-- Create a proper UPDATE policy for family members and service
CREATE POLICY "Family members can update resolved symptoms for their elders"
ON public.resolved_symptoms FOR UPDATE
USING (
  (elder_id IN (SELECT elders.id FROM elders WHERE elders.family_member_id = auth.uid()))
  OR (elder_id IN (SELECT elder_access.elder_id FROM elder_access WHERE elder_access.user_id = auth.uid()))
);

-- Create a proper DELETE policy for family members
CREATE POLICY "Family members can delete resolved symptoms for their elders"
ON public.resolved_symptoms FOR DELETE
USING (
  (elder_id IN (SELECT elders.id FROM elders WHERE elders.family_member_id = auth.uid()))
  OR (elder_id IN (SELECT elder_access.elder_id FROM elder_access WHERE elder_access.user_id = auth.uid()))
);