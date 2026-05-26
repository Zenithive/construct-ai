-- Migration 007: Add role column to users table
-- Run this against your database to enable admin functionality.
-- Then manually set role = 'admin' for admin users:
--   UPDATE users SET role = 'admin' WHERE email = 'your@email.com';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
