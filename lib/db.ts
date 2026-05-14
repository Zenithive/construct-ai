/**
 * lib/db.ts — PostgreSQL connection pool (pg).
 * Pool is reused across hot-reloads in development.
 */
import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Please check your environment variables.');
  }

  pool = global._pgPool ?? new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  if (process.env.NODE_ENV !== 'production') {
    global._pgPool = pool;
  }

  return pool;
}

export default {
  query: (text: string, params?: unknown[]) => getPool().query(text, params),
  connect: () => getPool().connect(),
};

export async function query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
