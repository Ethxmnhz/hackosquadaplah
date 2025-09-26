-- Policies & grants for managing minimal Free/Pro system
BEGIN;

-- Allow service_role full access for management (admin UI)
DROP POLICY IF EXISTS pro_content_requirements_manage ON public.pro_content_requirements;
CREATE POLICY pro_content_requirements_manage ON public.pro_content_requirements
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Read policy already broad; ensure it exists
DROP POLICY IF EXISTS pro_content_requirements_read ON public.pro_content_requirements;
CREATE POLICY pro_content_requirements_read ON public.pro_content_requirements
  FOR SELECT USING (true);

-- Users can view their own subscriptions (already) and insert their own via activate function; restrict direct manual inserts by normal users
DROP POLICY IF EXISTS pro_subs_direct_insert ON public.pro_subscriptions;
CREATE POLICY pro_subs_direct_insert ON public.pro_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant execute on activation function to authenticated so upgrade flow works
GRANT EXECUTE ON FUNCTION public.activate_pro_one_day(uuid, text) TO authenticated;

COMMIT;
