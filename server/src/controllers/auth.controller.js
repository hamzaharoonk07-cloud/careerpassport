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
