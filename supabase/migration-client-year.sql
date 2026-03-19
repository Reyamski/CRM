-- Add client_year column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_year TEXT;
