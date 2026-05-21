/**
 * Shared chat session helpers for API routes.
 */
import { query, queryOne } from '@/lib/db';
import type { ChatSessionRow } from '@/types';

export async function assertSessionOwner(
  sessionId: string,
  userId: string
): Promise<ChatSessionRow | null> {
  return queryOne<ChatSessionRow>(
    'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );
}

export async function bumpSessionUpdated(sessionId: string): Promise<void> {
  await query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [sessionId]);
}

export async function autoTitleSessionFromFirstUserMessage(
  sessionId: string,
  content: string
): Promise<void> {
  const count = await queryOne<{ count: string }>(
    "SELECT COUNT(*) AS count FROM chat_messages WHERE session_id = $1 AND message_type = 'user'",
    [sessionId]
  );
  if (count && parseInt(count.count, 10) === 1) {
    const title = content.slice(0, 60) + (content.length > 60 ? '…' : '');
    await query('UPDATE chat_sessions SET title = $1 WHERE id = $2', [title, sessionId]);
  }
}
