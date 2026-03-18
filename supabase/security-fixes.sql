-- ============================================================
-- Security Fixes — Run in Supabase SQL Editor
-- ============================================================

-- ── Fix 1: clients table — restrict write to authorized roles ──

DROP POLICY IF EXISTS "clients: authenticated insert" ON clients;
DROP POLICY IF EXISTS "clients: authenticated update" ON clients;

CREATE POLICY "clients: authorized insert" ON clients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('Broker / Owner', 'Admin Assistant', 'Manager / Compliance')
    )
  );

CREATE POLICY "clients: broker or manager update" ON clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('Broker / Owner', 'Admin Assistant', 'Manager / Compliance')
    )
  );

-- ── Fix 2: client_sensitive — restrict insert/update to authorized roles ──

DROP POLICY IF EXISTS "sensitive: authenticated insert" ON client_sensitive;
DROP POLICY IF EXISTS "sensitive: authenticated update" ON client_sensitive;

CREATE POLICY "sensitive: authorized insert" ON client_sensitive
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('Broker / Owner', 'Manager / Compliance')
    )
  );

CREATE POLICY "sensitive: authorized update" ON client_sensitive
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('Broker / Owner', 'Manager / Compliance')
    )
  );

-- ── Fix 3: profiles — prevent role self-escalation ──

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: no self update" ON profiles;

CREATE POLICY "profiles: no self update" ON profiles
  FOR UPDATE USING (false);

-- ── Fix 4: audit_log — ensure no one can delete audit entries ──

DROP POLICY IF EXISTS "audit: no delete" ON audit_log;

CREATE POLICY "audit: no delete" ON audit_log
  FOR DELETE USING (false);

-- ── Verify policies ──
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
