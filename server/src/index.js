import { env } from './config/env.js';
import { connectDB, disconnectDB, isMemoryDB } from './config/db.js';
import { createApp } from './app.js';
import { CareerField } from './models/index.js';

await connectDB();

/**
 * The development in-memory database lives inside this process and starts
 * empty every time, so seed it on boot. A real MONGO_URI is never touched —
 * seeding a persistent cluster stays an explicit `npm run seed`.
 */
if (isMemoryDB() && (await CareerField.estimatedDocumentCount()) === 0) {
  console.log('🌱  Empty in-memory database — seeding…');
  const { seedDatabase } = await import('./seed/seed.js');
  await seedDatabase({ log: (msg) => console.log(`    ${msg}`) });
}

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`🚀  PathSeeker API listening on http://localhost:${env.port}`);
  console.log(`    CORS origin: ${env.clientOrigin}`);
});

const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down.`);
  server.close();
  await disconnectDB();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
