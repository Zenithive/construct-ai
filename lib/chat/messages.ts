/**
 * Chat message persistence helpers.
 */
import { query } from '@/lib/db';
import { autoTitleSessionFromFirstUserMessage, bumpSessionUpdated } from '@/lib/chat/session';

export interface InsertMessageParams {
  messageId: string;
  sessionId: string;
  userId: string;
  messageType: 'user' | 'ai';
  content: string;
  citations?: unknown;
  confidence?: number | null;
  region?: string | null;
  category?: string | null;
  sources?: unknown;
}

export async function insertChatMessage(params: InsertMessageParams): Promise<void> {
  const {
    messageId,
    sessionId,
    userId,
    messageType,
    content,
    citations,
    confidence,
    region,
    category,
    sources,
  } = params;

  await query(
    `INSERT INTO chat_messages (id, session_id, user_id, message_type, content, citations, confidence, region, category, sources, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      messageId,
      sessionId,
      userId,
      messageType,
      content,
      citations ? JSON.stringify(citations) : null,
      confidence ?? null,
      region ?? null,
      category ?? null,
      sources ? JSON.stringify(sources) : null,
    ]
  );

  await bumpSessionUpdated(sessionId);

  if (messageType === 'user') {
    await autoTitleSessionFromFirstUserMessage(sessionId, content);
  }
}
