-- Add INSERT policy to alerts table for service functions
-- Edge Functions using SERVICE_ROLE_KEY already bypass RLS, but adding explicit policy
-- ensures architectural consistency and allows future migration to anon key if needed

CREATE POLICY "Service can create alerts for valid elders"
ON public.alerts
FOR INSERT
TO authenticated, anon
WITH CHECK (
  elder_id IN (SELECT id FROM public.elders)
);

-- Also add DELETE policy for cleanup operations by family members
CREATE POLICY "Family members can delete alerts for their elders"
ON public.alerts
FOR DELETE
USING (
  elder_id IN (
    SELECT elders.id
    FROM elders
    WHERE elders.family_member_id IN (
      SELECT profiles.id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  )
);