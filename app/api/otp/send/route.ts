/**
 * POST /api/otp/send
 * Body: { email }
 * Generates a 6-digit OTP and emails it.
 */
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '@/lib/db';
import { ok, err, isValidEmail, generateOTP, otpExpiresAt } from '@/lib/helpers';
import { sendOTPEmail } from '@/lib/mailer';
import type { UserRow } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body ?? {};

    if (!email) return err('email is required.');
    if (!isValidEmail(email)) return err('Invalid email address.');

    const user = await queryOne<UserRow>('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    // Return success regardless to avoid user enumeration
    if (!user) return ok({ message: 'If that email exists, a code has been sent.' });

    // Delete existing OTPs for this email
    await query('DELETE FROM otp_verifications WHERE email = $1', [email.toLowerCase()]);

    const otp = generateOTP();
    const expiresAt = otpExpiresAt();
    await query(
      `INSERT INTO otp_verifications (id, email, otp, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [uuidv4(), email.toLowerCase(), otp, expiresAt]
    );

    try { await sendOTPEmail(email, otp); } catch (mailErr) { console.error('[OTP email failed]', mailErr); }

    return ok({ message: 'Verification code sent. Check your email.' });
  } catch (e) {
    console.error('[POST /api/otp/send]', e);
    return err('Internal server error.', 500);
  }
}
