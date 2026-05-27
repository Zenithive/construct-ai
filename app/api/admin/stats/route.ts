/**
 * GET /api/admin/stats
 * Admin-only. Returns high-level platform metrics for the admin dashboard header.
 */
import { NextRequest } from 'next/server';
import { requireAdmin, AuthError, ForbiddenError } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req, queryOne);

    const result = await pool.query(`
      SELECT
        COUNT(*)::int                                                          AS total_users,
        COUNT(*) FILTER (WHERE plan_type = 'free')::int                       AS free_users,
        COUNT(*) FILTER (WHERE plan_type = 'pro')::int                        AS pro_users,
        COUNT(*) FILTER (WHERE plan_type = 'enterprise')::int                 AS enterprise_users,
        COUNT(*) FILTER (WHERE subscription_status = 'active')::int           AS active_subscriptions,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_users_30d
      FROM users
      WHERE role = 'user'
    `);

    const chatResult = await pool.query(`
      SELECT COUNT(*)::int AS total_chats FROM chat_sessions
    `);

    const tokenResult = await pool.query(`
      SELECT COALESCE(SUM(used_tokens), 0)::bigint AS total_tokens FROM usage_tracking
    `);

    const row   = result.rows[0];
    const chats = chatResult.rows[0];
    const tok   = tokenResult.rows[0];

    return ok({
      totalUsers:           row.total_users,
      freeUsers:            row.free_users,
      proUsers:             row.pro_users,
      enterpriseUsers:      row.enterprise_users,
      activeSubscriptions:  row.active_subscriptions,
      newUsers30d:          row.new_users_30d,
      totalChats:           chats.total_chats,
      totalTokens:          Number(tok.total_tokens),
    });
  } catch (e) {
    if (e instanceof AuthError)      return err(e.message, 401);
    if (e instanceof ForbiddenError) return err(e.message, 403);
    console.error('[GET /api/admin/stats]', e);
    return err('Internal server error.', 500);
  }
}
