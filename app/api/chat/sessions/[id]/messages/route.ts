/**
 * GET  /api/chat/sessions/[id]/messages  — fetch all messages in a session
 * POST /api/chat/sessions/[id]/messages  — save a new message (legacy; prefer /send for user prompts)
 */
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/auth';
import { checkCanSend } from '@/lib/billing/usage';
import { insertChatMessage } from '@/lib/chat/messages';
import { assertSessionOwner } from '@/lib/chat/session';
import { query, queryOne } from '@/lib/db';
import { ok, err, errCode } from '@/lib/helpers';
import type { ChatMessageRow } from '@/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = requireAuth(req);
    const session = await assertSessionOwner(params.id, authUser.userId);
    if (!session) return err('Session not found.', 404);

    const messages = await query<ChatMessageRow>(
      `SELECT id, message_type, content, citations, confidence, region, category, sources, feedback_type, feedback_reason, created_at
       FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [params.id]
    );
    return ok({
      messages: messages.map(m => ({
        id: m.id,
        message_type: m.message_type,
        content: m.content,
        citations: m.citations ?? undefined,
        confidence: m.confidence ?? undefined,
        region: m.region ?? undefined,
        category: m.category ?? undefined,
        sources: m.sources ?? undefined,
        feedback_type: m.feedback_type ?? undefined,
        feedback_reason: m.feedback_reason ?? undefined,
        created_at: m.created_at,
      })),
    });
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

    if (message_type === 'user') {
      const usageCheck = await checkCanSend(authUser.userId);
      if (!usageCheck.allowed) {
        return errCode('LIMIT_EXCEEDED', 'Message limit reached for your plan.', 403, {
          usage: {
            used: usageCheck.used,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            planCode: usageCheck.planCode,
          },
        });
      }
    }

    const messageId = uuidv4();
    await insertChatMessage({
      messageId,
      sessionId: params.id,
      userId: authUser.userId,
      messageType: message_type,
      content,
      citations,
      confidence,
      region,
      category,
      sources,
    });

    return ok({ message: { id: messageId } }, 201);
  } catch (e) {
    console.error('[POST /api/chat/sessions/[id]/messages]', e);
    return err('Internal server error.', 500);
  }
}
