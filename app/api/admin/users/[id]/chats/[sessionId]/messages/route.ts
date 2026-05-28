/**
 * GET /api/admin/users/[id]/chats/[sessionId]/messages — messages in a session (admin only)
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

    const session = await queryOne<{ id: string; title: string }>(
      'SELECT id, title FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [params.sessionId, params.id]
    );
    if (!session) return err('Session not found.', 404);

    const messages = await query<ChatMessageRow>(
      `SELECT id, message_type, content, prompt_tokens, completion_tokens, total_tokens, latency, created_at
       FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [params.sessionId]
    );

    const sessionTokens = messages.reduce((sum, m) => sum + (m.total_tokens ?? 0), 0);

    return ok({
      session: { id: session.id, title: session.title },
      sessionTokens,
      messages: messages.map(m => ({
        id: m.id,
        message_type: m.message_type,
        content: m.content,
        prompt_tokens: m.prompt_tokens ?? 0,
        completion_tokens: m.completion_tokens ?? 0,
        total_tokens: m.total_tokens ?? 0,
        latency: m.latency ?? null,
        created_at: m.created_at,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError)      return err(e.message, 401);
    if (e instanceof ForbiddenError) return err(e.message, 403);
    console.error('[GET /api/admin/users/[id]/chats/[sessionId]/messages]', e);
    return err('Internal server error.', 500);
  }
}
