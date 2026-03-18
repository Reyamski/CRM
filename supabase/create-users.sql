-- ============================================================
-- Run this in Supabase SQL Editor
-- Creates the 3 CRM users directly — no dashboard needed
-- ============================================================

-- Step 1: Fix the trigger so it never blocks user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Admin Assistant')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Insert users (skip if email already exists)
DO $$
DECLARE
  broker_id    uuid;
  assistant_id uuid;
  manager_id   uuid;
BEGIN

  -- ── Broker / Owner ────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'broker@crm.local') THEN
    broker_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      broker_id, 'authenticated', 'authenticated',
      'broker@crm.local',
      crypt('Broker@2026!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Rose Fernandez","role":"Broker / Owner"}'::jsonb,
      false
    );
  ELSE
    SELECT id INTO broker_id FROM auth.users WHERE email = 'broker@crm.local';
  END IF;

  INSERT INTO profiles (id, name, role)
  VALUES (broker_id, 'Rose Fernandez', 'Broker / Owner')
  ON CONFLICT (id) DO UPDATE SET name = 'Rose Fernandez', role = 'Broker / Owner';

  -- ── Admin Assistant ───────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'assistant@crm.local') THEN
    assistant_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      assistant_id, 'authenticated', 'authenticated',
      'assistant@crm.local',
      crypt('Assistant@2026!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Mia Santos","role":"Admin Assistant"}'::jsonb,
      false
    );
  ELSE
    SELECT id INTO assistant_id FROM auth.users WHERE email = 'assistant@crm.local';
  END IF;

  INSERT INTO profiles (id, name, role)
  VALUES (assistant_id, 'Mia Santos', 'Admin Assistant')
  ON CONFLICT (id) DO UPDATE SET name = 'Mia Santos', role = 'Admin Assistant';

  -- ── Manager / Compliance ──────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager@crm.local') THEN
    manager_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      manager_id, 'authenticated', 'authenticated',
      'manager@crm.local',
      crypt('Manager@2026!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Lea Navarro","role":"Manager / Compliance"}'::jsonb,
      false
    );
  ELSE
    SELECT id INTO manager_id FROM auth.users WHERE email = 'manager@crm.local';
  END IF;

  INSERT INTO profiles (id, name, role)
  VALUES (manager_id, 'Lea Navarro', 'Manager / Compliance')
  ON CONFLICT (id) DO UPDATE SET name = 'Lea Navarro', role = 'Manager / Compliance';

END $$;

-- Step 3: Verify — should return 3 rows
SELECT u.email, p.name, p.role
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email IN ('broker@crm.local', 'assistant@crm.local', 'manager@crm.local');
