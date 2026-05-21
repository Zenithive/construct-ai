/**
 * Backfill subscriptions table for users with pro plan but no subscription row.
 * Usage: node scripts/repair-subscription-row.js [email]
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const Stripe = require('stripe');
const { v4: uuidv4 } = require('uuid');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const dbMatch = env.match(/^DATABASE_URL=(.+)$/m);
const stripeKey = env.match(/^STRIPE_SECRET_KEY=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');

if (!dbMatch || !stripeKey) {
  console.error('Need DATABASE_URL and STRIPE_SECRET_KEY in .env.local');
  process.exit(1);
}

const emailArg = process.argv[2];
const pool = new Pool({
  connectionString: dbMatch[1].trim().replace(/^["']|["']$/g, ''),
  ssl: dbMatch[1].includes('localhost') ? false : { rejectUnauthorized: false },
});
const stripe = new Stripe(stripeKey);

async function repairUser(user) {
  if (!user.stripe_customer_id) {
    console.log(`Skip ${user.email}: no stripe_customer_id`);
    return;
  }

  const { rows: existing } = await pool.query(
    'SELECT id FROM subscriptions WHERE user_id = $1 LIMIT 1',
    [user.id]
  );
  if (existing.length > 0) {
    console.log(`OK ${user.email}: already has subscription row`);
    return;
  }

  const list = await stripe.subscriptions.list({
    customer: user.stripe_customer_id,
    limit: 5,
  });
  const sub =
    list.data.find((s) => s.status === 'active' || s.status === 'trialing') ??
    list.data[0];
  if (!sub) {
    console.log(`Skip ${user.email}: no Stripe subscription found`);
    return;
  }

  const periodStart = user.current_period_start
    ? new Date(user.current_period_start)
    : new Date(sub.current_period_start * 1000);
  const periodEnd = user.current_period_end
    ? new Date(user.current_period_end)
    : new Date(sub.current_period_end * 1000);

  await pool.query(
    `INSERT INTO subscriptions (
       id, user_id, plan_code, provider, provider_subscription_id,
       status, amount, currency, started_at, expires_at, created_at
     ) VALUES ($1, $2, $3, 'stripe', $4, $5, $6, 'USD', $7, $8, NOW())`,
    [
      uuidv4(),
      user.id,
      user.plan_type || 'pro',
      sub.id,
      sub.status,
      sub.items?.data?.[0]?.price?.unit_amount
        ? sub.items.data[0].price.unit_amount / 100
        : null,
      periodStart.toISOString(),
      periodEnd.toISOString(),
    ]
  );
  console.log(`Fixed ${user.email}: inserted subscription ${sub.id}`);
}

async function main() {
  const q = emailArg
    ? `SELECT id, email, plan_type, stripe_customer_id, current_period_start, current_period_end
       FROM users WHERE email = $1`
    : `SELECT id, email, plan_type, stripe_customer_id, current_period_start, current_period_end
       FROM users WHERE plan_type IN ('pro', 'enterprise')`;
  const { rows } = await pool.query(q, emailArg ? [emailArg.toLowerCase()] : []);
  for (const user of rows) {
    await repairUser(user);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
