-- Migration 006: Enterprise plan display fields (optional; unlimited = NULL message_limit).

UPDATE subscription_plans
SET
  name = 'Enterprise',
  price_monthly = COALESCE(price_monthly, 199.00),
  message_limit = NULL,
  features = COALESCE(features, '{"tier": "enterprise"}'::jsonb)
WHERE code = 'enterprise';

INSERT INTO subscription_plans (name, code, price_monthly, message_limit, features)
VALUES ('Enterprise', 'enterprise', 199.00, NULL, '{"tier": "enterprise"}'::jsonb)
ON CONFLICT (code) DO NOTHING;
