/**
 * DELETE /api/chat/sessions/[id]
 * Deletes a chat session owned by the authenticated user.
 */
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { ChatSessionRow } from '@/types';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = requireAuth(req);
    const session = await queryOne<ChatSessionRow>(
      'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [params.id, authUser.userId]
    );
    if (!session) return err('Session not found.', 404);
    await query('DELETE FROM chat_sessions WHERE id = $1', [params.id]);
    return ok({ message: 'Session deleted.' });
  } catch (e) {
    console.error('[DELETE /api/chat/sessions/[id]]', e);
    return err('Internal server error.', 500);
  }
}
