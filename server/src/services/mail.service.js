import nodemailer from 'nodemailer';
import { env, mailConfigured } from '../config/env.js';

/**
 * Outgoing mail.
 *
 * SMTP rather than a provider's own SDK, because every provider speaks it —
 * Gmail, Brevo, Resend, Mailtrap — so changing provider is four environment
 * variables and no code. A provider SDK would have bought nothing here and
 * tied the reset flow to one company's API.
 *
 * The transport is created once and held at module scope. On Vercel a warm
 * function reuses its container, so rebuilding it per request would open a
 * fresh TLS connection every time a password was reset.
 */
let transport = null;

function getTransport() {
  if (transport) return transport;
  if (!mailConfigured()) return null;

  transport = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS. Deriving this from the
    // port rather than asking for it removes a setting people get wrong.
    secure: env.mail.port === 465,
    auth: { user: env.mail.user, pass: env.mail.pass },
    // A serverless function must not sit waiting on a dead SMTP host until
    // the platform kills it. Fail fast and let the caller log it.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transport;
}

/**
 * Send one message.
 *
 * Never throws. Mail is a side effect of the reset flow, not the point of
 * it, and a provider outage must not turn into a 500 that tells the caller
 * whether the address existed. The result says what happened so the caller
 * can log it; the caller's response to the user stays the same either way.
 *
 * @returns {Promise<{ sent: boolean, reason?: string }>}
 */
export async function sendMail({ to, subject, text, html }) {
  const tx = getTransport();
  if (!tx) return { sent: false, reason: 'not-configured' };

  try {
    await tx.sendMail({ from: env.mail.from, to, subject, text, html });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err?.message || 'send-failed' };
  }
}

/**
 * The password reset message.
 *
 * Plain text and HTML both, because a mail client that cannot render HTML
 * must still show the code — and a reset mail that arrives blank is worse
 * than one that arrives plain. Styling is inline: mail clients strip
 * <style> blocks, and several ignore anything outside the body.
 *
 * The code is large and spaced because it is going to be copied by hand,
 * often from a phone.
 */
export function resetCodeMessage({ name, code, minutes }) {
  const greeting = name ? `Hello ${name},` : 'Hello,';

  const text = [
    greeting,
    '',
    `Your PathSeeker password reset code is: ${code}`,
    '',
    `It expires in ${minutes} minutes and can only be used once.`,
    '',
    'If you did not ask to reset your password, you can ignore this message —',
    'nothing has changed on your account.',
    '',
    '— PathSeeker',
  ].join('\n');

  const html = `
<div style="margin:0;padding:24px;background:#0f1418;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#161d23;border:1px solid #2a343d;">
    <div style="padding:22px 26px;border-bottom:1px solid #2a343d;">
      <p style="margin:0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#63bdb4;">PathSeeker</p>
      <p style="margin:6px 0 0;font-size:17px;font-weight:600;color:#e3e7e3;">Password reset</p>
    </div>
    <div style="padding:26px;">
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#c8cfc9;">${greeting}</p>
      <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#c8cfc9;">Enter this code to set a new password:</p>
      <p style="margin:0 0 18px;font-family:Consolas,Menlo,monospace;font-size:34px;font-weight:700;letter-spacing:.22em;color:#63bdb4;">${code}</p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#9ca9b2;">It expires in ${minutes} minutes and can only be used once.</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#9ca9b2;">If you did not ask to reset your password, ignore this message — nothing has changed on your account.</p>
    </div>
  </div>
</div>`.trim();

  return { subject: `Your PathSeeker reset code: ${code}`, text, html };
}
