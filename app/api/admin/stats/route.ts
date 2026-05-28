/**
 * GET /api/admin/stats — platform-wide metrics (admin only)
 */
import { NextRequest } from 'next/server';
import { requireAdmin, AuthError, ForbiddenError } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req, queryOne);

    const [usersRes, chatRes, tokenRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int                                                          AS total_users,
          COUNT(*) FILTER (WHERE plan_type = 'free')::int                       AS free_users,
          COUNT(*) FILTER (WHERE plan_type = 'pro')::int                        AS pro_users,
          COUNT(*) FILTER (WHERE plan_type = 'enterprise')::int                 AS enterprise_users,
          COUNT(*) FILTER (WHERE subscription_status = 'active')::int           AS active_subscriptions,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_users_30d
        FROM users WHERE role = 'user'
      `),
      pool.query(`SELECT COUNT(*)::int AS total_chats FROM chat_sessions`),
      pool.query(`SELECT COALESCE(SUM(cm.total_tokens), 0)::bigint AS total_tokens FROM chat_sessions cs JOIN chat_messages cm ON cm.session_id = cs.id`),
    ]);

    const row = usersRes.rows[0];
    return ok({
      totalUsers:          row.total_users,
      freeUsers:           row.free_users,
      proUsers:            row.pro_users,
      enterpriseUsers:     row.enterprise_users,
      activeSubscriptions: row.active_subscriptions,
      newUsers30d:         row.new_users_30d,
      totalChats:          chatRes.rows[0].total_chats,
      totalTokens:         Number(tokenRes.rows[0].total_tokens),
    });
  } catch (e) {
    if (e instanceof AuthError)      return err(e.message, 401);
    if (e instanceof ForbiddenError) return err(e.message, 403);
    console.error('[GET /api/admin/stats]', e);
    return err('Internal server error.', 500);
  }
}
