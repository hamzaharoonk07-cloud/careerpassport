import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

/**
 * Connects to MongoDB.
 *
 * If MONGO_URI is set we use it (Atlas, or a local mongod).
 * If it is empty and we are not in production, we spin up
 * mongodb-memory-server — a real mongod binary running in-memory —
 * so the app is runnable with zero external setup. Data does not
 * survive a restart, which is why it is refused in production.
 */
export async function connectDB() {
  let uri = env.mongoUri;

  if (!uri) {
    if (env.isProd) {
      throw new Error('MONGO_URI is required in production.');
    }
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    console.log('⏳  No MONGO_URI set — starting in-memory MongoDB (first run downloads a mongod binary)…');
    memoryServer = await MongoMemoryServer.create({ instance: { dbName: env.mongoDbName } });
    uri = memoryServer.getUri();
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName: env.mongoDbName });

  const { host, name } = mongoose.connection;
  console.log(`✅  MongoDB connected → ${memoryServer ? 'in-memory' : host}/${name}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export const isMemoryDB = () => memoryServer !== null;
