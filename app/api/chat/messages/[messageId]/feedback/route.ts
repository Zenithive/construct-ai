/**
 * POST /api/chat/messages/[messageId]/feedback
 * Saves like/dislike feedback for an AI message in our DB and forwards
 * it to the Python AI backend.
 */
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { ChatMessageRow } from '@/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const authUser = requireAuth(req);
    const { messageId } = params;

    const body = await req.json();
    const { session_id, feedback_type, feedback_reason } = body ?? {};

    if (!session_id) return err('session_id is required.');
    if (!feedback_type || !['like', 'dislike'].includes(feedback_type))
      return err('feedback_type must be "like" or "dislike".');

    // Verify the message exists and belongs to this user's session
    const message = await queryOne<ChatMessageRow>(
      `SELECT id FROM chat_messages
       WHERE id = $1 AND session_id = $2 AND user_id = $3`,
      [messageId, session_id, authUser.userId]
    );
    if (!message) return err('Message not found.', 404);

    // Upsert feedback (one feedback per user per message — updates if they change their mind)
    await query(
      `INSERT INTO message_feedback (message_id, user_id, session_id, feedback_type, feedback_reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (message_id, user_id)
       DO UPDATE SET feedback_type = EXCLUDED.feedback_type,
                     feedback_reason = EXCLUDED.feedback_reason,
                     created_at = NOW()`,
      [
        messageId,
        authUser.userId,
        session_id,
        feedback_type,
        feedback_reason ?? null,
      ]
    );

    // Forward to Python AI backend (fire-and-forget; don't block the response)
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_AI_BASE_URL ||
        'https://construction-ai-new-production-9b17.up.railway.app';

      fetch(`${baseUrl}/api/v1/chat/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, feedback_type, feedback_reason: feedback_reason ?? '' }),
      }).catch((e) =>
        console.warn('[feedback] Python AI backend unavailable:', e?.message)
      );
    } catch (_) {
      // Never let a Python backend error break the user-facing response
    }

    return ok({ success: true });
  } catch (e) {
    console.error('[POST /api/chat/messages/[messageId]/feedback]', e);
    return err('Internal server error.', 500);
  }
}
