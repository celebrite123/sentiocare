-- Add UPDATE policy for patient_communications so org members can update delivery/read status
CREATE POLICY "Org members can update communications"
ON public.patient_communications
FOR UPDATE
TO public
USING (organization_id = get_user_org_id(auth.uid()))
WITH CHECK (organization_id = get_user_org_id(auth.uid()));