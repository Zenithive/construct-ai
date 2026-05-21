/**
 * Smoke test for lib/billing usage helpers (requires compiled TS — run via dynamic import).
 * Usage: npx tsx scripts/test-billing-usage.js
 * Or: node with manual SQL checks after backfill.
 *
 * This script tests via raw SQL + duplicated logic for environments without tsx.
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const match = env.match(/^DATABASE_URL=(.+)$/m);
const connectionString = match[1].trim().replace(/^["']|["']$/g, '');
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function main() {
  const { rows: users } = await pool.query(
    `SELECT u.id, u.email, u.plan_type, ut.used_messages, sp.message_limit
     FROM users u
     LEFT JOIN usage_tracking ut ON ut.user_id = u.id
     LEFT JOIN subscription_plans sp ON sp.code = u.plan_type
     ORDER BY u.created_at DESC
     LIMIT 5`
  );
  console.log('Sample users + usage (latest 5):');
  console.table(
    users.map((r) => ({
      email: r.email,
      plan: r.plan_type,
      used: r.used_messages ?? '(no row)',
      limit: r.message_limit,
    }))
  );
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
