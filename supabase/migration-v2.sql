-- ============================================================
-- Migration v2 — Richer records + User management
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Option 2: Broker mortgage fields on clients ──

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS mortgage_type  TEXT,
  ADD COLUMN IF NOT EXISTS lender         TEXT,
  ADD COLUMN IF NOT EXISTS property_address TEXT,
  ADD COLUMN IF NOT EXISTS loan_amount    NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS rate_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- ── Option 3: Team management fields on profiles ──

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email     TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ── Update trigger to copy email from auth.users ──

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Admin Assistant'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Populate email for existing profiles (run once) ──
-- UPDATE profiles p
--   SET email = u.email
--   FROM auth.users u
--   WHERE p.id = u.id AND p.email IS NULL;

-- ── RLS: Allow authenticated users to read all profiles ──

DROP POLICY IF EXISTS "profiles: authenticated read" ON profiles;
CREATE POLICY "profiles: authenticated read" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── RPC: update own display name (bypasses RLS safely) ──

CREATE OR REPLACE FUNCTION update_display_name(new_name TEXT)
RETURNS void AS $$
BEGIN
  IF length(trim(new_name)) = 0 THEN
    RAISE EXCEPTION 'Name cannot be empty';
  END IF;
  UPDATE profiles SET name = trim(new_name) WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC: broker sets a team member active/inactive ──

CREATE OR REPLACE FUNCTION set_member_active(target_user_id UUID, active BOOLEAN)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Broker / Owner'
  ) THEN
    RAISE EXCEPTION 'Permission denied: Broker / Owner role required';
  END IF;
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own active status';
  END IF;
  UPDATE profiles SET is_active = active WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Verify ──
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename, cmd;
