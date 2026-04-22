/**
 * lib/mailer.ts — Nodemailer transporter + email templates.
 */
import nodemailer from 'nodemailer';

declare global {
  // eslint-disable-next-line no-var
  var _mailer: nodemailer.Transporter | undefined;
}

function createTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

const mailer: nodemailer.Transporter = global._mailer ?? createTransporter();
if (process.env.NODE_ENV !== 'production') global._mailer = mailer;

export default mailer;

export async function sendOTPEmail(to: string, otp: string): Promise<void> {
  await mailer.sendMail({
    from: process.env.EMAIL_FROM || `ConstructAI <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your ConstructAI verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1d4ed8;">Verify your email</h2>
        <p>Use the code below to verify your ConstructAI account. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e293b;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
