/**
 * GET  /api/chat/sessions/[id]/messages  — fetch all messages in a session
 * POST /api/chat/sessions/[id]/messages  — save a new message
 */
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { ChatMessageRow, ChatSessionRow } from '@/types';

async function assertSessionOwner(sessionId: string, userId: string): Promise<ChatSessionRow | null> {
  return queryOne<ChatSessionRow>('SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = requireAuth(req);
    const session = await assertSessionOwner(params.id, authUser.userId);
    if (!session) return err('Session not found.', 404);

    const messages = await query<ChatMessageRow>(
      `SELECT id, message_type, content, citations, confidence, region, category, sources, created_at
       FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [params.id]
    );
    return ok({ messages: messages.map(m => ({ id: m.id, message_type: m.message_type, content: m.content, citations: m.citations ?? undefined, confidence: m.confidence ?? undefined, region: m.region ?? undefined, category: m.category ?? undefined, sources: m.sources ?? undefined, created_at: m.created_at })) });
  } catch (e) {
    console.error('[GET /api/chat/sessions/[id]/messages]', e);
    return err('Internal server error.', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = requireAuth(req);
    const session = await assertSessionOwner(params.id, authUser.userId);
    if (!session) return err('Session not found.', 404);

    const body = await req.json();
    const { message_type, content, citations, confidence, region, category, sources } = body ?? {};

    if (!message_type || !content) return err('message_type and content are required.');
    if (!['user', 'ai'].includes(message_type)) return err('message_type must be "user" or "ai".');

    const messageId = uuidv4();
    await query(
      `INSERT INTO chat_messages (id, session_id, user_id, message_type, content, citations, confidence, region, category, sources, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [messageId, params.id, authUser.userId, message_type, content, citations ? JSON.stringify(citations) : null, confidence ?? null, region ?? null, category ?? null, sources ? JSON.stringify(sources) : null]
    );

    // Bump session updated_at
    await query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [params.id]);

    // Auto-title from first user message
    if (message_type === 'user') {
      const count = await queryOne<{ count: string }>(
        "SELECT COUNT(*) AS count FROM chat_messages WHERE session_id = $1 AND message_type = 'user'",
        [params.id]
      );
      if (count && parseInt(count.count, 10) === 1) {
        const title = content.slice(0, 60) + (content.length > 60 ? '…' : '');
        await query('UPDATE chat_sessions SET title = $1 WHERE id = $2', [title, params.id]);
      }
    }

    return ok({ message: { id: messageId } }, 201);
  } catch (e) {
    console.error('[POST /api/chat/sessions/[id]/messages]', e);
    return err('Internal server error.', 500);
  }
}
