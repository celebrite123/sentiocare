-- Strengthen RLS on elders table to prevent any unauthorized access
-- First, drop the existing ALL policy to replace with more specific ones
DROP POLICY IF EXISTS "Family members can manage their elders" ON public.elders;

-- Create explicit SELECT policy - only authenticated family members can view their elders
CREATE POLICY "Authenticated family members can view their elders"
ON public.elders FOR SELECT
TO authenticated
USING (
  family_member_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  )
);

-- Create explicit INSERT policy - only authenticated family members can create elders
CREATE POLICY "Authenticated family members can create elders"
ON public.elders FOR INSERT
TO authenticated
WITH CHECK (
  family_member_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  )
);

-- Create explicit UPDATE policy - only authenticated family members can update their elders
CREATE POLICY "Authenticated family members can update their elders"
ON public.elders FOR UPDATE
TO authenticated
USING (
  family_member_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  family_member_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  )
);

-- Create explicit DELETE policy - only authenticated family members can delete their elders
CREATE POLICY "Authenticated family members can delete their elders"
ON public.elders FOR DELETE
TO authenticated
USING (
  family_member_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  )
);

-- Explicitly revoke any public/anon access (defense in depth)
REVOKE ALL ON public.elders FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elders TO authenticated;