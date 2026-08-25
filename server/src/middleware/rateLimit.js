import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Tight limit on credential endpoints — blunts brute force without hurting
 * normal use. Twenty attempts in fifteen minutes is far more than a real
 * person needs and far fewer than an attacker wants.
 *
 * Relaxed in development only: the end-to-end smoke test registers several
 * accounts in a row and would otherwise trip its own defences. Production
 * always gets the strict number.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 20 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
