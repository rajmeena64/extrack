const fromEmail = process.env.EMAIL_FROM;
const fromName = process.env.EMAIL_FROM_NAME || 'Entrack';
const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;

function normalizeHttpUrl(value, envName) {
  const candidates = String(value || '')
    .split(',')
    .map((candidate) => candidate.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString().replace(/\/+$/, '');
      }
    } catch {
      // Try the next comma-separated value before failing below.
    }
  }

  if (!candidates.length) {
    throw new Error(`${envName} is required for auth emails`);
  }

  throw new Error(`${envName} must be a valid http(s) URL for auth emails`);
}

function getFrontendUrl() {
  return normalizeHttpUrl(process.env.FRONTEND_URL, 'FRONTEND_URL');
}

function getPasswordResetUrl(token) {
  const baseUrl = process.env.PASSWORD_RESET_URL
    ? normalizeHttpUrl(process.env.PASSWORD_RESET_URL, 'PASSWORD_RESET_URL')
    : `${getFrontendUrl()}/reset-password`;

  const url = new URL(baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEmailShell({ eyebrow, title, preview, body, buttonText, buttonUrl, footerNote }) {
  const safeButtonUrl = escapeHtml(buttonUrl);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;padding:0;background:#ffffff;color:#202124;font-family:Arial,Helvetica,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          ${escapeHtml(preview)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;padding:42px 14px 28px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
                <tr>
                  <td align="center" style="padding:0 0 18px;">
                    <div style="display:inline-block;width:46px;height:46px;border-radius:12px;background:#06131f;color:#30f2a1;font-size:26px;line-height:46px;font-weight:900;text-align:center;">E</div>
                    <div style="margin-top:12px;color:#101828;font-size:20px;font-weight:800;letter-spacing:0;">Entrack</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="background:#f5f7fb;border-radius:28px;padding:42px 34px;">
                    <div style="margin-bottom:14px;color:#2563eb;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(eyebrow)}</div>
                    <h1 style="margin:0 auto;color:#202124;font-size:30px;line-height:38px;font-weight:700;max-width:390px;">${escapeHtml(title)}</h1>
                    <div style="margin:18px auto 0;color:#4b5563;font-size:16px;line-height:25px;max-width:390px;text-align:center;">
                      ${body}
                    </div>
                    ${buttonText && buttonUrl ? `
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:26px;">
                        <tr>
                          <td style="border-radius:999px;background:#0b57d0;">
                            <a href="${safeButtonUrl}" style="display:inline-block;padding:13px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:999px;">${escapeHtml(buttonText)}</a>
                          </td>
                        </tr>
                      </table>
                      <div style="margin:24px auto 0;color:#6b7280;font-size:12px;line-height:18px;max-width:420px;text-align:center;">
                        If the button does not work, copy and paste this link into your browser:<br>
                        <a href="${safeButtonUrl}" style="color:#2563eb;text-decoration:none;word-break:break-all;">${safeButtonUrl}</a>
                      </div>
                    ` : ''}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:22px 12px 0;color:#7b8494;font-size:12px;line-height:18px;">
                    <div style="max-width:480px;">
                      ${footerNote}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:14px 12px 0;color:#9aa3b2;font-size:12px;line-height:18px;">
                    © ${new Date().getFullYear()} Entrack. This is a security email, please do not reply.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function sendMail({ to, subject, html, text }) {
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is required for auth emails');
  }

  if (!fromEmail) {
    throw new Error('EMAIL_FROM is required for auth emails');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    let message = `Resend email failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      message = errorBody?.message || errorBody?.error || message;
    } catch {
      // Keep the status-based message if Resend returns a non-JSON error.
    }
    throw new Error(message);
  }
}

async function sendVerificationEmail({ email, name, token }) {
  const link = `${getFrontendUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: email,
    subject: 'Verify your Entrack email',
    text: `Hi ${name}, verify your Entrack email: ${link}. This link expires in 60 minutes.`,
    html: renderEmailShell({
      eyebrow: 'Email verification',
      title: `Hi ${name || 'there'}, finish setting up your Entrack account`,
      preview: 'Verify your email to finish creating your Entrack account.',
      body: `
        <p style="margin:0;">Confirm your email address to activate your trading journal and keep your account secure.</p>
      `,
      buttonText: 'Verify email',
      buttonUrl: link,
      footerNote: 'This verification link expires in 60 minutes. If you did not create an Entrack account, you can safely ignore this email.',
    }),
  });
}

async function sendPasswordResetEmail({ email, name, token }) {
  const link = getPasswordResetUrl(token);

  await sendMail({
    to: email,
    subject: 'Reset your Entrack password',
    text: `Hi ${name}, reset your Entrack password: ${link}. This link expires in 30 minutes.`,
    html: renderEmailShell({
      eyebrow: 'Password reset',
      title: `Hi ${name || 'there'}, reset your Entrack password`,
      preview: 'Use this secure link to set a new Entrack password.',
      body: `
        <p style="margin:0;">We received a request to reset your password. Use this secure link to choose a new one.</p>
      `,
      buttonText: 'Reset password',
      buttonUrl: link,
      footerNote: 'This reset link expires in 30 minutes and can only be used once. If you did not request a password reset, you can ignore this email.',
    }),
  });
}

async function sendPasswordChangedEmail({ email, name }) {
  await sendMail({
    to: email,
    subject: 'Your Entrack password was changed',
    text: `Hi ${name}, your Entrack password was changed. If this was not you, contact support immediately.`,
    html: renderEmailShell({
      eyebrow: 'Security notification',
      title: `Hi ${name || 'there'}, your password was changed`,
      preview: 'Your Entrack password was changed.',
      body: `
        <p style="margin:0;">This is a confirmation that the password for your Entrack account was changed.</p>
      `,
      footerNote: 'If this was you, no action is needed. If you did not make this change, reset your password immediately and contact support.',
    }),
  });
}

async function sendLoginNotificationEmail({ email, name, ipAddress, userAgent, loginTime = new Date(), method = 'password' }) {
  const loginDate = loginTime instanceof Date ? loginTime : new Date(loginTime);
  const formattedTime = Number.isNaN(loginDate.getTime())
    ? new Date().toUTCString()
    : loginDate.toUTCString();
  const methodLabel = method === 'google' ? 'Google sign-in' : 'password sign-in';
  const safeIpAddress = ipAddress || 'Unknown';
  const safeUserAgent = userAgent || 'Unknown device';

  await sendMail({
    to: email,
    subject: 'New login to your Entrack account',
    text: [
      `Hi ${name || 'there'}, your Entrack account was logged in using ${methodLabel}.`,
      `Time: ${formattedTime}`,
      `IP address: ${safeIpAddress}`,
      `Device: ${safeUserAgent}`,
      'If this was you, no action is needed. If this was not you, reset your password immediately.',
    ].join('\n'),
    html: renderEmailShell({
      eyebrow: 'Security notification',
      title: `Hi ${name || 'there'}, your account was logged in`,
      preview: 'A new login was detected on your Entrack account.',
      body: `
        <p style="margin:0;">We detected a successful ${escapeHtml(methodLabel)} to your Entrack account.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin-top:22px;text-align:left;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Time</td>
            <td style="padding:10px 0;color:#111827;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(formattedTime)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">IP address</td>
            <td style="padding:10px 0;color:#111827;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(safeIpAddress)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#6b7280;font-size:13px;">Device</td>
            <td style="padding:10px 0;color:#111827;font-size:13px;font-weight:700;text-align:right;word-break:break-word;">${escapeHtml(safeUserAgent)}</td>
          </tr>
        </table>
      `,
      footerNote: 'If this was you, no action is needed. If you do not recognize this login, reset your password immediately and contact support.',
    }),
  });
}

module.exports = {
  getFrontendUrl,
  getPasswordResetUrl,
  sendLoginNotificationEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
