/**
 * GET  /api/chat/sessions  — list sessions for the authenticated user
 * POST /api/chat/sessions  — create a new session
 */
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { ChatSessionRow } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const sessions = await query<ChatSessionRow>(
      `SELECT id, title, created_at, updated_at FROM chat_sessions
       WHERE user_id = $1 ORDER BY updated_at DESC`,
      [authUser.userId]
    );
    return ok({ sessions: sessions.map(s => ({ id: s.id, title: s.title, created_at: s.created_at, updated_at: s.updated_at })) });
  } catch (e) {
    console.error('[GET /api/chat/sessions]', e);
    return err('Internal server error.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const title = (body?.title as string)?.trim() || 'New Chat';

    const session = await queryOne<ChatSessionRow>(
      `INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, title, created_at, updated_at`,
      [uuidv4(), authUser.userId, title]
    );
    if (!session) return err('Failed to create session.', 500);
    return ok({ session: { id: session.id, title: session.title, created_at: session.created_at, updated_at: session.updated_at } }, 201);
  } catch (e) {
    console.error('[POST /api/chat/sessions]', e);
    return err('Internal server error.', 500);
  }
}
