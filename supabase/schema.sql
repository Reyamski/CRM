-- ============================================================
-- Broker CRM — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Profiles (extends auth.users) ──────────────────────────
CREATE TABLE profiles (
  id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  role    TEXT NOT NULL CHECK (role IN ('Broker / Owner', 'Admin Assistant', 'Manager / Compliance')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "profiles: read own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- ── Clients ────────────────────────────────────────────────
CREATE TABLE clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL,
  date_of_birth    DATE,
  sin_masked       TEXT DEFAULT 'Not collected',
  address          TEXT,
  email            TEXT,
  phone            TEXT,
  marital_status   TEXT CHECK (marital_status IN (
                     'Single','Married','Common-law','Divorced','Separated','Widowed'
                   )),
  spouse_name      TEXT,
  file_location    TEXT,
  status           TEXT DEFAULT 'Pending' CHECK (status IN ('Active','Pending','Closed','Archived')),
  created_by       UUID REFERENCES profiles(id),
  created_by_name  TEXT,
  last_modified_by UUID REFERENCES profiles(id),
  last_modified_by_name TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read clients
CREATE POLICY "clients: authenticated read" ON clients
  FOR SELECT USING (auth.role() = 'authenticated');

-- All authenticated users can insert clients
CREATE POLICY "clients: authenticated insert" ON clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- All authenticated users can update clients
CREATE POLICY "clients: authenticated update" ON clients
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Only Broker / Owner can delete (soft-delete via status preferred)
CREATE POLICY "clients: broker delete" ON clients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'Broker / Owner'
    )
  );

-- ── Client Sensitive Data (SIN — separate table for column-level control) ──
CREATE TABLE client_sensitive (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  sin_full  TEXT
);

ALTER TABLE client_sensitive ENABLE ROW LEVEL SECURITY;

-- Only Broker / Owner and Manager / Compliance can read full SIN
CREATE POLICY "sensitive: authorized read" ON client_sensitive
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('Broker / Owner', 'Manager / Compliance')
    )
  );

-- Any authenticated user can insert (when creating a client with SIN)
CREATE POLICY "sensitive: authenticated insert" ON client_sensitive
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Any authenticated user can update SIN
CREATE POLICY "sensitive: authenticated update" ON client_sensitive
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── Client Notes ───────────────────────────────────────────
CREATE TABLE client_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_by  UUID REFERENCES profiles(id),
  created_by_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes: authenticated read" ON client_notes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "notes: authenticated insert" ON client_notes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── Audit Log ──────────────────────────────────────────────
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT NOT NULL,
  actor_id    UUID REFERENCES profiles(id),
  actor_name  TEXT NOT NULL,
  target_name TEXT NOT NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only Broker / Owner and Manager / Compliance can read audit log
CREATE POLICY "audit: authorized read" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('Broker / Owner', 'Manager / Compliance')
    )
  );

-- All authenticated users can insert audit events
CREATE POLICY "audit: authenticated insert" ON audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── Auto-update updated_at on clients ─────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Auto-create profile on user signup ────────────────────
-- NOTE: After creating users in Supabase Auth dashboard,
-- insert their profiles manually or use this trigger.
-- The trigger expects user_metadata to contain: name, role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'role'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
