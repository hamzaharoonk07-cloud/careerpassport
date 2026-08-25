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
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

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
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
};

/** Is this address one of the configured owners? */
export const isAdminEmail = (email) =>
  Boolean(email) && env.adminEmails.includes(String(email).trim().toLowerCase());
