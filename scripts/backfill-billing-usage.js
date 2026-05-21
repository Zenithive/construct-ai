/**
 * Backfill usage_tracking for existing users missing a current-period row.
 * Usage: node scripts/backfill-billing-usage.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

function getCalendarMonthPeriod(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return {
    period_start: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
    period_end: new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0)),
  };
}

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const connectionString = match[1].trim().replace(/^["']|["']$/g, '');
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function main() {
  const { period_start, period_end } = getCalendarMonthPeriod();

  await pool.query(
    `UPDATE users
     SET plan_type = COALESCE(plan_type, 'free'),
         subscription_status = COALESCE(subscription_status, 'inactive')
     WHERE plan_type IS NULL OR subscription_status IS NULL`
  );

  const { rows: users } = await pool.query('SELECT id, email FROM users');
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const { rows: existing } = await pool.query(
      `SELECT id FROM usage_tracking WHERE user_id = $1 AND period_start = $2`,
      [user.id, period_start.toISOString()]
    );
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    await pool.query(
      `INSERT INTO usage_tracking (id, user_id, used_messages, used_tokens, period_start, period_end, created_at)
       VALUES ($1, $2, 0, 0, $3, $4, NOW())`,
      [uuidv4(), user.id, period_start.toISOString(), period_end.toISOString()]
    );
    created++;
    console.log(`  + usage row for ${user.email}`);
  }

  console.log(`Backfill done: ${created} created, ${skipped} already had current period.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
