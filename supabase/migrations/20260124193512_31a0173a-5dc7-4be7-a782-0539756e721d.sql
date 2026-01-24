-- Add policy to allow users to view their own membership record
-- This is needed for B2B login to verify the user is a staff member
CREATE POLICY "Users can view their own membership"
ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());