/**
 * Mail diagnostics.
 *
 *   node server/tools/mail-check.mjs                 check the settings and the connection
 *   node server/tools/mail-check.mjs you@gmail.com   ...and send a real test message
 *
 * "The email is not arriving" has half a dozen causes that all look
 * identical from the outside, because the reset endpoint deliberately gives
 * the same answer whatever happens — that is the point of it, and it is also
 * what makes it undebuggable. This script is the other side of that trade:
 * it says exactly which part is wrong, and it is never reachable over HTTP.
 */
import nodemailer from 'nodemailer';
import { env, mailConfigured } from '../src/config/env.js';

const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m) => console.log(`  FAIL  ${m}`);
const warn = (m) => console.log(`  warn  ${m}`);

console.log('\nPathSeeker mail check\n' + '─'.repeat(52));

/* ── 1. Are the four values present? ─────────────────── */
console.log('\nSettings');

const missing = [];
for (const [key, value] of [
  ['SMTP_HOST', env.mail.host],
  ['SMTP_USER', env.mail.user],
  ['SMTP_PASS', env.mail.pass],
  ['MAIL_FROM', env.mail.from],
]) {
  if (value) ok(`${key} is set`);
  else { bad(`${key} is empty`); missing.push(key); }
}
ok(`SMTP_PORT is ${env.mail.port}${env.mail.port === 465 ? ' (implicit TLS)' : ' (STARTTLS)'}`);

if (missing.length) {
  console.log(
    `\nNothing can send while ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} empty.\n` +
    `Set them in server/.env for local use, and in Vercel's project settings\n` +
    `for the deployment. DEPLOY.md has the steps for a Gmail App Password.\n`
  );
  process.exit(1);
}

/* ── 2. The mistakes that look like a working config ─── */
console.log('\nCommon mistakes');

const pass = env.mail.pass;
const isGmail = /gmail|googlemail/i.test(env.mail.host);

if (/\s/.test(pass)) {
  bad('SMTP_PASS contains a space — Google displays the App Password in four');
  console.log('        blocks of four, but it must be pasted as 16 unbroken characters.');
} else ok('SMTP_PASS has no spaces');

if (isGmail && pass.length !== 16) {
  bad(`SMTP_PASS is ${pass.length} characters — a Gmail App Password is exactly 16`);
  console.log('        Your ordinary Gmail password will always be rejected here.');
  console.log('        Create one at https://myaccount.google.com/apppasswords');
} else ok('SMTP_PASS is a plausible length');

if (env.mail.from !== env.mail.user) {
  warn(`MAIL_FROM (${env.mail.from}) differs from SMTP_USER (${env.mail.user})`);
  console.log('        Most providers reject a From address they do not own.');
} else ok('MAIL_FROM matches SMTP_USER');

if (!mailConfigured()) {
  bad('mailConfigured() is false — the app would not even try to send');
  process.exit(1);
}

/* ── 3. Does the provider actually accept us? ─────────── */
console.log('\nConnection');

const transport = nodemailer.createTransport({
  host: env.mail.host,
  port: env.mail.port,
  secure: env.mail.port === 465,
  auth: { user: env.mail.user, pass: env.mail.pass },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

try {
  await transport.verify();
  ok(`${env.mail.host}:${env.mail.port} accepted the login`);
} catch (err) {
  bad(`${env.mail.host}:${env.mail.port} refused us`);
  console.log(`        ${err.message}`);

  const m = String(err.message);
  if (/Invalid login|535|BadCredentials/i.test(m)) {
    console.log('\n        The host is reachable but the username or password is wrong.');
    if (isGmail) {
      console.log('        With Gmail this is almost always the normal account password');
      console.log('        being used instead of a 16-character App Password.');
    }
  } else if (/ENOTFOUND|EAI_AGAIN/i.test(m)) {
    console.log('\n        The hostname did not resolve. Check SMTP_HOST for a typo.');
  } else if (/ETIMEDOUT|ECONNREFUSED/i.test(m)) {
    console.log('\n        Nothing answered on that port. Some networks block outbound');
    console.log('        SMTP — try port 465, or test from a different connection.');
  }
  console.log();
  process.exit(1);
}

/* ── 4. Send one, if asked ───────────────────────────── */
const to = process.argv[2];
if (!to) {
  console.log(
    '\nSettings and login are good. To send a real test message:\n' +
    '  node server/tools/mail-check.mjs your@address.com\n'
  );
  process.exit(0);
}

console.log('\nTest message');
try {
  const info = await transport.sendMail({
    from: env.mail.from,
    to,
    subject: 'PathSeeker mail check',
    text: 'If you are reading this, password reset codes will arrive too.',
  });
  ok(`accepted for delivery to ${to}`);
  console.log(`        id: ${info.messageId}`);
  console.log('\nIf it does not appear within a minute, check the spam folder —');
  console.log('a first message from a new sender often lands there.\n');
} catch (err) {
  bad(`the provider refused the message: ${err.message}`);
  console.log();
  process.exit(1);
}
