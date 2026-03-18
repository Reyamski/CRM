-- Run this in Supabase SQL Editor to fix the user creation trigger.
-- The original trigger fails when name/role metadata is missing (e.g. created via dashboard UI).
-- This version uses safe defaults so user creation never fails.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert profile if metadata contains name and role
  -- If missing, insert a placeholder so the user can be updated later
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
