import { env } from '../config/env.js';

export function notFound(req, res, next) {
  res.status(404).json({ ok: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);

  // Mongo duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ ok: false, message: `That ${field} is already registered.` });
  }

  const body = {
    ok: false,
    message: err.expected || status < 500 ? err.message : 'Something went wrong on our end.',
  };
  if (err.details) body.details = err.details;
  if (!env.isProd && status >= 500) body.stack = err.stack;

  if (status >= 500) console.error('✖', err);
  res.status(status).json(body);
}
