/**
 * POST /api/auth/reset-password
 *
 * Two modes:
 *   1. Token-based (forgot password flow): Body { token, newPassword }
 *   2. Authenticated (change password while logged in): Body { newPassword } + Bearer token
 */
import { NextRequest } from 'next/server';
import { getAuthUser, hashPassword } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { ok, err, isStrongPassword } from '@/lib/helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = body ?? {};

    if (!newPassword)          return err('newPassword is required.', 400);
    if (!isStrongPassword(newPassword)) return err('Password must be at least 6 characters.', 400);

    const passwordHash = await hashPassword(newPassword);

    // ── Mode 1: token-based (unauthenticated) ─────────────────────────────
    if (token) {
      const row = await queryOne<{
        id: string;
        user_id: string;
        expires_at: string;
        used: boolean;
      }>(
        `SELECT id, user_id, expires_at, used
         FROM password_reset_tokens
         WHERE token = $1`,
        [token]
      );

      if (!row)        return err('Invalid or expired reset link.', 400);
      if (row.used)    return err('This reset link has already been used.', 400);
      if (new Date(row.expires_at) < new Date()) return err('This reset link has expired. Please request a new one.', 400);

      // Update password and mark token as used in one transaction
      await query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, row.user_id]);
      await query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [row.id]);

      return ok({ message: 'Password updated successfully. You can now sign in.' });
    }

    // ── Mode 2: authenticated change-password ─────────────────────────────
    const authUser = getAuthUser(req);
    if (!authUser) return err('Unauthorized. Provide a reset token or sign in first.', 401);

    await query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, authUser.userId]);
    return ok({ message: 'Password updated successfully.' });

  } catch (e) {
    console.error('[POST /api/auth/reset-password]', e);
    return err('Internal server error.', 500);
  }
}
