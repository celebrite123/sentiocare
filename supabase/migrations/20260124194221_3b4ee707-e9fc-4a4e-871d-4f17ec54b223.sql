-- Create a helper function to break RLS recursion
-- This function runs with SECURITY DEFINER to bypass RLS when checking user's org
CREATE OR REPLACE FUNCTION public.get_user_org_id(uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = uid LIMIT 1
$$;

-- Create function to check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = uid AND (role = 'admin' OR can_manage_staff = true)
  )
$$;

-- Drop the recursive policies that cause infinite loop
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage org members" ON public.organization_members;

-- Recreate non-recursive policies using helper functions
CREATE POLICY "Members can view org members"
ON public.organization_members
FOR SELECT
USING (
  organization_id = public.get_user_org_id(auth.uid())
);

-- Admin policy for INSERT (creating new staff)
CREATE POLICY "Org admins can insert members"
ON public.organization_members
FOR INSERT
WITH CHECK (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.is_org_admin(auth.uid())
);

-- Admin policy for UPDATE
CREATE POLICY "Org admins can update members"
ON public.organization_members
FOR UPDATE
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.is_org_admin(auth.uid())
);

-- Admin policy for DELETE
CREATE POLICY "Org admins can delete members"
ON public.organization_members
FOR DELETE
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.is_org_admin(auth.uid())
);