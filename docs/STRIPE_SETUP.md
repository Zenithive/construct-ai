# Stripe setup (ConstructAI)

## 1. Stripe Dashboard

Create two products (or one product with two prices):

| Plan | Env variable | App limit |
|------|----------------|-----------|
| Pro | `STRIPE_PRICE_PRO_MONTHLY` | Set in DB `subscription_plans.message_limit` (e.g. 1000) |
| Enterprise | `STRIPE_PRICE_ENTERPRISE_MONTHLY` | `NULL` = unlimited messages |

1. Create **Pro** — recurring monthly price → copy Price ID to `STRIPE_PRICE_PRO_MONTHLY`.
2. Create **Enterprise** — recurring monthly price → copy Price ID to `STRIPE_PRICE_ENTERPRISE_MONTHLY`.

## 2. API keys

From [Stripe API keys](https://dashboard.stripe.com/apikeys):

- `STRIPE_SECRET_KEY` — Secret key (test: `sk_test_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Publishable key (optional for hosted Checkout redirect)

## 3. Webhook endpoint

**Production:** `https://your-domain.com/api/webhook/stripe`

**Events to enable:**

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Copy the signing secret → `STRIPE_WEBHOOK_SECRET` (`whsec_...`).

## 4. Local development

**Why the DB did not update after checkout?**

Stripe Checkout only charges the card in the browser. Your app updates `users` / `subscriptions` when Stripe calls **`POST /api/webhook/stripe`**. On `localhost`, Stripe cannot reach that URL unless you forward events.

**Option A — Stripe CLI (webhooks, recommended for production-like testing)**

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Copy the `whsec_...` printed by the CLI into `STRIPE_WEBHOOK_SECRET` (it changes each time you run `listen`). Restart `npm run dev`.

**Option B — No CLI (redirect fallback)**

After payment, Stripe redirects to `/dashboard?checkout=success&session_id=cs_...`. The app calls `POST /api/billing/confirm-checkout` to apply the same DB updates without a webhook. This is already wired — you only need a successful redirect with `session_id` in the URL.

**Do not** use the Dashboard webhook signing secret while using the CLI — they are different and webhooks will return 400.

## 5. Test checkout

1. Set all env vars in `.env.local`.
2. `npm run dev`
3. Hit message limit or click **Upgrade to Pro**.
4. Use test card `4242 4242 4242 4242`, any future expiry, any CVC.
5. After redirect, confirm `users.plan_type = 'pro'` and usage reset in DB.

## API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/billing/create-checkout-session` | JWT | Returns Stripe Checkout URL |
| `POST /api/webhook/stripe` | Signature only | Applies subscription/payment updates |
