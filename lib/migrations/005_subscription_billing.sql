-- Migration 005: Subscription, usage tracking, and payments schema.

-- ── Users: billing columns ────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ── Subscription plans ────────────────────────────────────────────────────────

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

-- ── Usage tracking (per billing period) ─────────────────────────────────────

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

-- ── Subscriptions ─────────────────────────────────────────────────────────────

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

-- ── Payments ──────────────────────────────────────────────────────────────────

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
