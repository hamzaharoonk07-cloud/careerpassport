import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import {
  setAuthCookies,
  clearAuthCookies,
  verifyRefreshToken,
  REFRESH_COOKIE,
} from '../utils/tokens.js';
import { isAdminEmail, env } from '../config/env.js';

/** The only shape of a user that ever leaves the server. */
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  passportNumber: user.passportNumber,
  role: user.role,
  accountType: user.accountType,
  profile: user.profile,
  journeyStage: user.journeyStage,
  selectedField: user.selectedField,
  latestResult: user.latestResult,
  createdAt: user.createdAt,
});

export const register = asyncHandler(async (req, res) => {
  const {
    name, email, password, accountType,
    education, age, currentRole, location, skills, interests,
  } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('An account with that email already exists.', { email: 'Already registered' });

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email,
    passwordHash,
    // Configured owner addresses register straight into the admin role.
    // Everyone else gets the model default.
    ...(isAdminEmail(email) ? { role: 'admin' } : {}),
    accountType: accountType || 'student',
    profile: {
      education: education || '',
      age: age ?? null,
      currentRole: currentRole || '',
      location: location || '',
      skills: skills || [],
      interests: interests || [],
    },
  });

  setAuthCookies(res, user);
  res.status(201).json({ ok: true, user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // `passwordHash` is select:false on the model, so it must be asked for explicitly.
  const user = await User.findOne({ email }).select('+passwordHash');

  // One message for both cases — telling an attacker which half was wrong
  // turns the login form into an account-enumeration tool.
  const invalid = ApiError.unauthorized('Email or password is incorrect.');
  if (!user) throw invalid;
  if (!(await user.verifyPassword(password))) throw invalid;

  user.lastLoginAt = new Date();
  await user.save();

  setAuthCookies(res, user);
  res.json({ ok: true, user: publicUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true, message: 'Signed out.' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, user: publicUser(req.user) });
});

/**
 * Exchanges a valid refresh token for a fresh pair.
 *
 * `refreshTokenVersion` on the user is the revocation switch: bump it and
 * every refresh token issued before that moment stops working.
 */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No session to refresh.');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Your session expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.refreshTokenVersion !== payload.v) {
    clearAuthCookies(res);
    throw ApiError.unauthorized('That session is no longer valid.');
  }

  setAuthCookies(res, user);
  res.json({ ok: true, user: publicUser(user) });
});

export { publicUser };

/* ══════════════════════════════════════════════════════════════
   Password reset
   ══════════════════════════════════════════════════════════════ */

const RESET_TTL_MS = 15 * 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;

/**
 * Start a reset.
 *
 * Always answers the same way, whether or not the address is registered.
 * Saying "no such account" turns this endpoint into a way to test which
 * emails exist, which is worth more to an attacker than the reset itself.
 *
 * There is no mail service wired up, so the code is written to the server
 * log in development. It is never returned in the response — an endpoint
 * that hands back its own reset code is not a reset, it is a bypass.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    user.passwordReset = {
      codeHash: await User.hashPassword(code),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
      attempts: 0,
    };
    await user.save();

    if (!env.isProd) {
      console.log(`
  Password reset code for ${email}: ${code}  (valid 15 minutes)
`);
    }
    // In production this is where the mail or SMS would be sent.
  }

  res.json({
    ok: true,
    message: 'If that address has an account, a six-digit code is on its way. It expires in 15 minutes.',
  });
});

/**
 * Finish a reset.
 *
 * On success every existing session is invalidated by bumping
 * refreshTokenVersion — if the account was taken over, changing the
 * password has to log the intruder out, not leave their refresh token live.
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;

  const user = await User.findOne({ email }).select(
    '+passwordReset.codeHash +passwordReset.expiresAt +passwordReset.attempts'
  );

  const invalid = () =>
    ApiError.badRequest('That code is not valid, or it has expired.', { code: 'Check the code' });

  if (!user || !user.passwordReset?.codeHash) throw invalid();
  if (!user.passwordReset.expiresAt || user.passwordReset.expiresAt < new Date()) throw invalid();

  if (user.passwordReset.attempts >= MAX_RESET_ATTEMPTS) {
    // Burn the code rather than leaving it to be ground down.
    user.passwordReset = { codeHash: null, expiresAt: null, attempts: 0 };
    await user.save();
    throw ApiError.badRequest('Too many attempts. Request a new code.', { code: 'Start again' });
  }

  const match = await bcrypt.compare(code, user.passwordReset.codeHash);
  if (!match) {
    user.passwordReset.attempts += 1;
    await user.save();
    throw invalid();
  }

  user.passwordHash = await User.hashPassword(password);
  user.passwordReset = { codeHash: null, expiresAt: null, attempts: 0 };
  user.refreshTokenVersion += 1;
  await user.save();

  res.json({ ok: true, message: 'Password changed. Sign in with your new password.' });
});
