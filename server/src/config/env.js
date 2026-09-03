import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter((k) => !process.env[k] || process.env[k].startsWith('replace_me'));
if (missing.length) {
  throw new Error(
    `Missing or placeholder env vars: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
  );
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  /**
   * Where the browser is allowed to call this API from.
   *
   * On Vercel the site and the API share an origin, so CORS is not doing
   * any work — but the middleware still compares against this value, and a
   * localhost default would reject every real request. VERCEL_URL is
   * injected by the platform and names the deployment, so it is the correct
   * fallback there.
   */
  clientOrigin:
    process.env.CLIENT_ORIGIN ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'),

  mongoUri: process.env.MONGO_URI || '',
  mongoDbName: process.env.MONGO_DB_NAME || 'pathseeker',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,

  /**
   * Emails that always hold the admin role.
   *
   * Without this the only administrator is the seeded account, and the
   * owner's own registration comes out as an ordinary user with the panel
   * hidden from them. Promoting by hand does not survive a restart on the
   * in-memory database, so the allowlist is applied on registration and
   * again on every boot.
   *
   * Comma-separated. Compared lower-cased and trimmed.
   */
  /**
   * The owner account, seeded on every boot with the admin role.
   *
   * Lives in the environment rather than in seed.js because seed.js is
   * committed and this file is not — a real password in the repository
   * would be readable by anyone who clones it.
   */
  owner: {
    name: process.env.OWNER_NAME || 'Owner',
    email: (process.env.OWNER_EMAIL || '').trim().toLowerCase(),
    password: process.env.OWNER_PASSWORD || '',
  },

  /**
   * Outgoing mail, over SMTP so it is not tied to one provider.
   *
   * Every provider worth using speaks SMTP — Gmail, Brevo, Resend, Mailtrap
   * — so the same four values point at any of them and switching is a
   * change of environment, not of code. `from` falls back to the login
   * address because most providers reject a From they do not own.
   *
   * With `host` empty there is no mail configured, and the reset flow says
   * so in the log rather than pretending the message went out.
   */
  mail: {
    host: (process.env.SMTP_HOST || '').trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    user: (process.env.SMTP_USER || '').trim(),
    pass: process.env.SMTP_PASS || '',
    from: (process.env.MAIL_FROM || process.env.SMTP_USER || '').trim(),
  },

  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
};

/** Is there a mail provider configured? */
export const mailConfigured = () =>
  Boolean(env.mail.host && env.mail.user && env.mail.pass && env.mail.from);

/** Is this address one of the configured owners? */
export const isAdminEmail = (email) =>
  Boolean(email) && env.adminEmails.includes(String(email).trim().toLowerCase());
