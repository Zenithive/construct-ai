-- ConstructAI — PostgreSQL schema
-- Run this against your Railway / Postgres DB before starting the app.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT NOT NULL UNIQUE,
  password              TEXT NOT NULL,
  "firstName"           TEXT NOT NULL,
  "lastName"            TEXT NOT NULL,
  is_verified           BOOLEAN NOT NULL DEFAULT FALSE,
  country               TEXT NOT NULL DEFAULT 'England',
  plan_type             TEXT NOT NULL DEFAULT 'free',
  subscription_status   TEXT NOT NULL DEFAULT 'inactive',
  stripe_customer_id    TEXT,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- OTP Verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL,
  otp         TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_email ON otp_verifications (email);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions (user_id);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id         UUID NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  message_type       TEXT NOT NULL CHECK (message_type IN ('user', 'ai')),
  content            TEXT NOT NULL,
  citations          JSONB,
  confidence         FLOAT,
  region             TEXT,
  category           TEXT,
  sources            JSONB,
  feedback_type      TEXT CHECK (feedback_type IN ('Like', 'Dislike')),
  feedback_reason    TEXT,
  prompt_tokens      INT,
  completion_tokens  INT,
  total_tokens       INT,
  latency            INT,   -- milliseconds
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages (session_id);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  region     TEXT,
  category   TEXT,
  severity   TEXT CHECK (severity IN ('high', 'medium', 'low')),
  summary    TEXT,
  date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts (user_id);

-- Uploaded files
CREATE TABLE IF NOT EXISTS uploaded_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name   TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  path          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files (user_id);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  code           TEXT NOT NULL UNIQUE,
  price_monthly  DECIMAL(10, 2),
  message_limit  INT,
  features       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans (name, code, price_monthly, message_limit, features)
VALUES
  ('Free', 'free', 0, 20, '{"tier": "free"}'::jsonb),
  ('Pro', 'pro', NULL, 1000, '{"tier": "pro"}'::jsonb),
  ('Enterprise', 'enterprise', NULL, NULL, '{"tier": "enterprise"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Usage tracking (per billing period)
CREATE TABLE IF NOT EXISTS usage_tracking (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  used_messages  INT NOT NULL DEFAULT 0,
  used_tokens    BIGINT NOT NULL DEFAULT 0,
  period_start   TIMESTAMPTZ NOT NULL,
  period_end     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_start)
);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period_end
  ON usage_tracking (user_id, period_end DESC);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_code                 TEXT NOT NULL,
  provider                  TEXT NOT NULL,
  provider_subscription_id  TEXT,
  status                    TEXT,
  amount                    DECIMAL(10, 2),
  currency                  TEXT NOT NULL DEFAULT 'USD',
  started_at                TIMESTAMPTZ,
  expires_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription_id
  ON subscriptions (provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subscription_id     UUID REFERENCES subscriptions (id) ON DELETE SET NULL,
  provider_payment_id TEXT,
  amount              DECIMAL(10, 2),
  currency            TEXT NOT NULL DEFAULT 'USD',
  status              TEXT,
  payment_method      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_payment_id
  ON payments (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;
