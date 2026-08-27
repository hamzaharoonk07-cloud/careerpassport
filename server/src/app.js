import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  /**
   * 100kb everywhere except the two upload endpoints.
   *
   * This parser runs before any route, so it was rejecting a file upload with
   * 413 long before the 2mb parser on the route itself was reached: a base64
   * photograph over about 73KB never got past here. The uploads opt out and
   * set their own ceiling; everything else keeps the tight default, because a
   * JSON body larger than 100kb anywhere else is a mistake or an attack.
   */
  const UPLOAD_PATHS = new Set(['/api/users/me/photo', '/api/users/me/resume', '/api/users/me/upload']);
  const json100 = express.json({ limit: '100kb' });
  app.use((req, res, next) => (UPLOAD_PATHS.has(req.path) ? next() : json100(req, res, next)));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  // Uploaded story and multimedia files. `nosniff` so the browser honours the
  // type verified on the way in rather than guessing a new one.
  app.use('/uploads/media', express.static(
    path.resolve(__dirname, '../uploads/media'),
    { setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'), maxAge: '7d' }
  ));

  app.use(cookieParser());
  if (!env.isProd) app.use(morgan('dev'));
  app.use('/api', apiLimiter);

  app.get('/api/health', (req, res) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
      ok: true,
      service: 'pathseeker-api',
      env: env.nodeEnv,
      db: states[mongoose.connection.readyState] ?? 'unknown',
      uptime: Math.round(process.uptime()),
    });
  });

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
