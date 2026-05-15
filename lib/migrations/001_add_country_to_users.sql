-- Migration: 001_add_country_to_users
-- Adds the `country` column to the users table with a default of 'England'.
-- Safe to run multiple times (uses IF NOT EXISTS guard).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'country'
  ) THEN
    ALTER TABLE users
      ADD COLUMN country TEXT NOT NULL DEFAULT 'England';
  END IF;
END
$$;
