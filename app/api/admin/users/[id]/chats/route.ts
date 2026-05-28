/**
 * GET /api/admin/users/[id]/chats — all chat sessions for a user (admin only)
 */
import { NextRequest } from 'next/server';
import { requireAdmin, AuthError, ForbiddenError } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { ok, err } from '@/lib/helpers';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req, queryOne);

    const sessions = await query<{
      id: string; title: string; created_at: string; updated_at: string;
      message_count: number; session_tokens: number;
    }>(
      `SELECT cs.id, cs.title, cs.created_at, cs.updated_at,
              COUNT(cm.id)::int                             AS message_count,
              COALESCE(SUM(cm.total_tokens), 0)::int        AS session_tokens
       FROM chat_sessions cs
       LEFT JOIN chat_messages cm ON cm.session_id = cs.id
       WHERE cs.user_id = $1
       GROUP BY cs.id
       ORDER BY cs.updated_at DESC`,
      [params.id]
    );

    const totalTokens = sessions.reduce((sum, s) => sum + s.session_tokens, 0);

    return ok({ sessions, totalTokens });
  } catch (e) {
    if (e instanceof AuthError)      return err(e.message, 401);
    if (e instanceof ForbiddenError) return err(e.message, 403);
    console.error('[GET /api/admin/users/[id]/chats]', e);
    return err('Internal server error.', 500);
  }
}
