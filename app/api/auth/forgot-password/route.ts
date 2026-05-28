/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Sends a password reset link. Always returns 200 to prevent user enumeration.
 */
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { queryOne, query } from '@/lib/db';
import { ok, err, isValidEmail } from '@/lib/helpers';
import { sendPasswordResetEmail } from '@/lib/mailer';
import type { UserRow } from '@/types';

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body ?? {};

    if (!email || !isValidEmail(email)) return err('A valid email address is required.', 400);

    const user = await queryOne<Pick<UserRow, 'id' | 'email' | 'firstName'>>(
      'SELECT id, email, "firstName" FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Always respond with success — never reveal whether the email exists
    if (!user) return ok({ message: 'If that email is registered, a reset link has been sent.' });

    // Invalidate existing unused tokens
    await query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user.id]);

    const token    = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt.toISOString()]
    );

    const appUrl   = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return ok({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (e) {
    console.error('[POST /api/auth/forgot-password]', e);
    return err('Internal server error.', 500);
  }
}
