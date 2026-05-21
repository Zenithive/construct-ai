/**
 * Reconcile usage_tracking.used_messages from actual user messages in each period.
 * Usage: node scripts/reconcile-usage.js
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
  const { rows } = await pool.query(
    `SELECT ut.id, ut.user_id, u.email, ut.period_start, ut.period_end, ut.used_messages,
            (
              SELECT COUNT(*)::int
              FROM chat_messages cm
              WHERE cm.user_id = ut.user_id
                AND cm.message_type = 'user'
                AND cm.created_at >= ut.period_start
                AND cm.created_at < ut.period_end
            ) AS actual_count
     FROM usage_tracking ut
     JOIN users u ON u.id = ut.user_id
     WHERE ut.period_start <= NOW() AND ut.period_end > NOW()`
  );

  for (const row of rows) {
    if (row.actual_count !== row.used_messages) {
      await pool.query(
        'UPDATE usage_tracking SET used_messages = $1 WHERE id = $2',
        [row.actual_count, row.id]
      );
      console.log(
        `Updated ${row.email}: ${row.used_messages} -> ${row.actual_count}`
      );
    } else {
      console.log(`OK ${row.email}: ${row.used_messages} messages`);
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
