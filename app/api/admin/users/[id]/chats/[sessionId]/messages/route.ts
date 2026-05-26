/**
 * GET /api/admin/users/[id]/chats/[sessionId]/messages
 * Admin-only. Returns all messages in a specific chat session.
 */
import { NextRequest } from 'next/server';
import { requireAdmin, AuthError, ForbiddenError } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { ChatMessageRow } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    await requireAdmin(req, queryOne);

    // Verify session belongs to the user
    const session = await queryOne<{ id: string; title: string }>(
      'SELECT id, title FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [params.sessionId, params.id]
    );
    if (!session) return err('Session not found.', 404);

    const messages = await query<ChatMessageRow>(
      `SELECT id, message_type, content, created_at
       FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [params.sessionId]
    );

    return ok({
      session: { id: session.id, title: session.title },
      messages: messages.map(m => ({
        id:           m.id,
        message_type: m.message_type,
        content:      m.content,
        created_at:   m.created_at,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError)      return err(e.message, 401);
    if (e instanceof ForbiddenError) return err(e.message, 403);
    console.error('[GET /api/admin/users/[id]/chats/[sessionId]/messages]', e);
    return err('Internal server error.', 500);
  }
}
