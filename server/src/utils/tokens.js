import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Two tokens, two jobs.
 *
 *   access  — short-lived (15m), proves who you are on every request
 *   refresh — long-lived (7d), only ever used to mint a new access token
 *
 * Both travel as httpOnly cookies, so page JavaScript cannot read them
 * and an XSS bug cannot exfiltrate a session.
 */
export function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user._id), v: user.refreshTokenVersion },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshTtl }
  );
}

export const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, env.jwt.refreshSecret);

export const ACCESS_COOKIE = 'ps_at';
export const REFRESH_COOKIE = 'ps_rt';

/**
 * SameSite=Strict in production kills cross-site request forgery outright.
 * In development the client is proxied through Vite to the same origin,
 * so Lax is sufficient and avoids fighting the dev server.
 */
function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'strict' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookies(res, user) {
  res.cookie(ACCESS_COOKIE, signAccessToken(user), cookieOptions(FIFTEEN_MINUTES));
  res.cookie(REFRESH_COOKIE, signRefreshToken(user), cookieOptions(SEVEN_DAYS));
}

export function clearAuthCookies(res) {
  const base = { httpOnly: true, secure: env.isProd, sameSite: env.isProd ? 'strict' : 'lax', path: '/' };
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
