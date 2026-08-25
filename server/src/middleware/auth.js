import { User } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { ACCESS_COOKIE, verifyAccessToken } from '../utils/tokens.js';

/**
 * Rejects the request unless a valid access token cookie is present
 * AND the user it points at still exists.
 *
 * The database lookup is deliberate: a deleted or demoted user must
 * lose access immediately, not when their token happens to expire.
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) throw ApiError.unauthorized('You need to be signed in to do that.');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Your session expired. Please sign in again.' : 'Invalid session.'
    );
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('That account no longer exists.');

  req.user = user;
  next();
});

/** Attaches req.user when signed in, but never blocks. For endpoints that behave differently when known. */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = await User.findById(payload.sub);
    } catch {
      req.user = null; // an invalid token is simply treated as signed out here
    }
  }
  next();
});

/**
 * Role gate. Always applied server-side — hiding a link in the UI is
 * not authorisation, and anyone can type a URL.
 */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('You do not have access to that.'));
    next();
  };
