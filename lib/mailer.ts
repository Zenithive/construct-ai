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
    from: process.env.EMAIL_FROM || `ConstructionAI <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your ConstructionAI verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1d4ed8;">Verify your email</h2>
        <p>Use the code below to verify your ConstructionAI account. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e293b;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const logoPath = process.env.NODE_ENV === 'production'
    ? `${process.env.NEXT_PUBLIC_APP_URL}/logo192.png`
    : null;

  // Use CID-embedded attachment for local dev (works in all clients including Gmail)
  // Use hosted URL in production
  const useAttachment = !logoPath;

  const imgTag = useAttachment
    ? `<img src="cid:logo@constructionai" width="32" height="32" alt="ConstructionAI" style="display:block;border-radius:7px;" />`
    : `<img src="${logoPath}" width="32" height="32" alt="ConstructionAI" style="display:block;border-radius:7px;" />`;

  const mailOptions: nodemailer.SendMailOptions = {
    from: process.env.EMAIL_FROM || `ConstructionAI <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your ConstructionAI password',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <!-- Logo -->
        <div style="margin-bottom:28px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:middle;">
                ${imgTag}
              </td>
              <td style="vertical-align:middle;padding-left:9px;">
                <span style="font-size:15px;font-weight:500;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Construction</span><span style="font-size:15px;font-weight:500;color:#1D9E75;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">AI</span><span style="font-size:15px;color:#999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">.chat</span>
              </td>
            </tr>
          </table>
        </div>

        <h2 style="color:#111;font-size:22px;font-weight:600;margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Reset your password</h2>
        <p style="color:#555;font-size:14px;margin:0 0 24px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          We received a request to reset the password for your account. Click the button below to choose a new password.
          This link expires in <strong>1 hour</strong>.
        </p>

        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          <tr>
            <td style="border-radius:8px;background:#1D9E75;">
              <a href="${resetUrl}"
                 style="display:inline-block;background:#1D9E75;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                Reset Password
              </a>
            </td>
          </tr>
        </table>

        <p style="color:#999;font-size:12px;margin:0 0 8px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          If you didn't request a password reset, you can safely ignore this email. Your password will not change.
        </p>
        <p style="color:#bbb;font-size:11px;margin:0;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          Or copy this link into your browser:<br/>
          <a href="${resetUrl}" style="color:#1D9E75;word-break:break-all;">${resetUrl}</a>
        </p>

        <hr style="border:none;border-top:1px solid #f0f0ec;margin:28px 0 16px;" />
        <p style="color:#ccc;font-size:11px;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          &copy; ${new Date().getFullYear()} ConstructionAI.chat &mdash; All rights reserved.
        </p>
      </div>
    `,
  };

  // Attach logo as inline CID image for local dev
  if (useAttachment) {
    const path = await import('path');
    const logoFilePath = path.join(process.cwd(), 'public', 'logo192.png');
    mailOptions.attachments = [
      {
        filename: 'logo.png',
        path: logoFilePath,
        cid: 'logo@constructionai', // matches src="cid:logo@constructionai"
      },
    ];
  }

  await mailer.sendMail(mailOptions);
}
