import { connectDB } from '../server/src/config/db.js';
import { createApp } from '../server/src/app.js';

/**
 * Serverless entry point for Vercel.
 *
 * Vercel runs this as a function rather than a long-lived server, which
 * changes two things about how the app has to start:
 *
 *   1. There is no `listen`. The platform hands us (req, res) and expects
 *      the Express app to handle it, so the app is exported rather than
 *      bound to a port.
 *
 *   2. The connection is cached across invocations. A warm function reuses
 *      its container, and reconnecting to Mongo on every request would
 *      exhaust the connection pool within minutes of real traffic. The
 *      promise is held at module scope so concurrent cold starts share one
 *      connection attempt instead of racing to open several.
 */
let ready = null;

const boot = async () => {
  if (!ready) ready = connectDB();
  await ready;
};

const app = createApp();

export default async function handler(req, res) {
  try {
    await boot();
  } catch (err) {
    // A failed connection must not look like a routing problem. Without
    // this the caller gets an opaque 500 and the logs say nothing useful.
    console.error('Database connection failed:', err);
    res.status(503).json({
      ok: false,
      message: 'The database is unavailable. Check MONGO_URI in the project settings.',
    });
    return;
  }
  return app(req, res);
}
