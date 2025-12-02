-- Drop existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Family members can manage their elders" ON public.elders;
DROP POLICY IF EXISTS "Family members can view their elders" ON public.elders;

-- Create PERMISSIVE policies instead
CREATE POLICY "Family members can manage their elders"
ON public.elders
FOR ALL
TO authenticated
USING (family_member_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
))
WITH CHECK (family_member_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));