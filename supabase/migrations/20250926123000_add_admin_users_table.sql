-- Admin users table for billing admin access
CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid REFERENCES auth.users(id),
  notes text
);

-- Basic RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY admin_users_service_all ON admin_users FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Allow an existing admin to read list (optional; could restrict further)
CREATE POLICY admin_users_admin_select ON admin_users FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM admin_users)
);

-- Allow an existing admin to insert/remove other admins (optional governance)
CREATE POLICY admin_users_admin_manage ON admin_users FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM admin_users)
);
CREATE POLICY admin_users_admin_delete ON admin_users FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM admin_users)
);
