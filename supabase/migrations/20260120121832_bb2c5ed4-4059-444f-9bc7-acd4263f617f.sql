-- =============================================
-- SECURITY HARDENING MIGRATION
-- =============================================

-- 1. Fix B2B Leads spam vulnerability - Add basic validation to INSERT policy
DROP POLICY IF EXISTS "Anyone can submit B2B inquiries" ON public.b2b_leads;

CREATE POLICY "Rate limited B2B inquiries"
ON public.b2b_leads FOR INSERT
WITH CHECK (
  -- Basic validation - real rate limiting should be in edge function
  length(organization_name) >= 2 AND
  length(contact_name) >= 2 AND
  length(contact_email) >= 5 AND
  length(contact_phone) >= 10 AND
  organization_type IN ('hospital', 'nursing_home', 'assisted_living', 'home_care', 'other')
);

-- 2. Add elder_access users to health_metrics SELECT policy
DROP POLICY IF EXISTS "Family members can view health metrics for their elders" ON public.health_metrics;

CREATE POLICY "Family and authorized users can view health metrics"
ON public.health_metrics FOR SELECT
TO authenticated
USING (
  elder_id IN (
    SELECT id FROM elders 
    WHERE family_member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR
  elder_id IN (
    SELECT elder_id FROM elder_access WHERE user_id = auth.uid()
  )
);

-- 3. Add elder_access users to check_ins SELECT policy
DROP POLICY IF EXISTS "Family members can view check-ins for their elders" ON public.check_ins;

CREATE POLICY "Family and authorized users can view check-ins"
ON public.check_ins FOR SELECT
TO authenticated
USING (
  elder_id IN (
    SELECT id FROM elders 
    WHERE family_member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR
  elder_id IN (
    SELECT elder_id FROM elder_access WHERE user_id = auth.uid()
  )
);

-- 4. Add elder_access users to conversation_logs SELECT policy
DROP POLICY IF EXISTS "Family members can view conversation logs" ON public.conversation_logs;

CREATE POLICY "Family and authorized users can view conversation logs"
ON public.conversation_logs FOR SELECT
TO authenticated
USING (
  check_in_id IN (
    SELECT id FROM check_ins 
    WHERE elder_id IN (
      SELECT id FROM elders 
      WHERE family_member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR elder_id IN (
      SELECT elder_id FROM elder_access WHERE user_id = auth.uid()
    )
  )
);

-- 5. Add elder_access users to alerts policies
DROP POLICY IF EXISTS "Family members can view alerts for their elders" ON public.alerts;

CREATE POLICY "Family and authorized users can view alerts"
ON public.alerts FOR SELECT
TO authenticated
USING (
  elder_id IN (
    SELECT id FROM elders 
    WHERE family_member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR
  elder_id IN (
    SELECT elder_id FROM elder_access WHERE user_id = auth.uid()
  )
);

-- 6. Add elder_access users to medicines SELECT
DROP POLICY IF EXISTS "Family members can manage medicines for their elders" ON public.medicines;

CREATE POLICY "Family members can manage medicines"
ON public.medicines FOR ALL
TO authenticated
USING (
  elder_id IN (
    SELECT id FROM elders 
    WHERE family_member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  elder_id IN (
    SELECT id FROM elders 
    WHERE family_member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Authorized users can view medicines"
ON public.medicines FOR SELECT
TO authenticated
USING (
  elder_id IN (
    SELECT elder_id FROM elder_access WHERE user_id = auth.uid()
  )
);

-- 7. Add elder_access users to whatsapp_conversations
DROP POLICY IF EXISTS "Family members can view their elders' WhatsApp conversations" ON public.whatsapp_conversations;

CREATE POLICY "Family and authorized users can view whatsapp conversations"
ON public.whatsapp_conversations FOR SELECT
TO authenticated
USING (
  elder_id IN (
    SELECT id FROM elders 
    WHERE family_member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR
  elder_id IN (
    SELECT elder_id FROM elder_access WHERE user_id = auth.uid()
  )
);

-- 8. Add elder_access users to whatsapp_messages
DROP POLICY IF EXISTS "Family members can view their elders' WhatsApp messages" ON public.whatsapp_messages;

CREATE POLICY "Family and authorized users can view whatsapp messages"
ON public.whatsapp_messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM whatsapp_conversations 
    WHERE elder_id IN (
      SELECT id FROM elders 
      WHERE family_member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR elder_id IN (
      SELECT elder_id FROM elder_access WHERE user_id = auth.uid()
    )
  )
);