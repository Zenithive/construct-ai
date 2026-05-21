/**
 * One-off runner for lib/migrations/005_subscription_billing.sql
 * Usage: node scripts/run-migration-005.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Missing .env.local with DATABASE_URL');
  process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8');
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const connectionString = match[1].trim().replace(/^["']|["']$/g, '');
const sqlPath = path.join(__dirname, '..', 'lib', 'migrations', '005_subscription_billing.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function main() {
  await pool.query(sql);
  const { rows } = await pool.query(
    'SELECT code, message_limit FROM subscription_plans ORDER BY code'
  );
  console.log('Migration 005 applied successfully.');
  console.log('subscription_plans:', rows);
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
