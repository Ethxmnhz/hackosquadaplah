-- Normalize admin_users: ensure primary key column user_id exists and tighten policies
DO $$ BEGIN
  -- If user_id column missing but id exists, rename
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='user_id'
  ) THEN
    ALTER TABLE admin_users RENAME COLUMN id TO user_id;
  END IF;

  -- If table lacks PK on user_id, add it
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname='admin_users' AND c.contype='p'
  ) THEN
    ALTER TABLE admin_users ADD PRIMARY KEY (user_id);
  END IF;
END $$;

-- Drop overly permissive existing policies
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='admin_users' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON admin_users', r.policyname);
  END LOOP;
END $$;

-- Recreate minimal secure policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY admin_users_service_all ON admin_users FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Existing admin read list & manage others
CREATE POLICY admin_users_admin_select ON admin_users FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM admin_users)
);
CREATE POLICY admin_users_admin_insert ON admin_users FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM admin_users)
);
CREATE POLICY admin_users_admin_delete ON admin_users FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM admin_users)
);

-- Allow self-read of own row (optional)
CREATE POLICY admin_users_self_select ON admin_users FOR SELECT USING (auth.uid() = user_id);

-- Seed first admin helper comment:
-- Insert the initial admin row manually (service role or SQL editor):
-- INSERT INTO admin_users (user_id) VALUES ('<your-user-uuid>') ON CONFLICT DO NOTHING;
