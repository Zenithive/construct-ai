/**
 * POST /api/otp/verify
 * Body: { email, otp }
 * Verifies OTP and marks user email as verified.
 */
import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { ok, err, isValidEmail } from '@/lib/helpers';

interface OTPVerificationRow {
  id: string;
  email: string;
  otp: string;
  expires_at: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body ?? {};

    if (!email || !otp) return err('email and otp are required.');
    if (!isValidEmail(email)) return err('Invalid email address.');

    const record = await queryOne<OTPVerificationRow>(
      `SELECT id, email, expires_at FROM otp_verifications
       WHERE email = $1 AND otp = $2
       LIMIT 1`,
      [email.toLowerCase(), otp.toString()]
    );

    if (!record) return err('Invalid or expired verification code.', 400);
    if (new Date(record.expires_at) < new Date()) {
      await query('DELETE FROM otp_verifications WHERE id = $1', [record.id]);
      return err('Verification code has expired. Please request a new one.', 400);
    }

    // Delete OTP + verify user
    await query('DELETE FROM otp_verifications WHERE id = $1', [record.id]);
    await query('UPDATE users SET is_verified = true WHERE email = $1', [email.toLowerCase()]);

    return ok({ message: 'Email verified successfully.' });
  } catch (e) {
    console.error('[POST /api/otp/verify]', e);
    return err('Internal server error.', 500);
  }
}
