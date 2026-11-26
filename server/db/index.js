import { config } from '../config.js';
import { memoryRepo, loadMemory } from './memory.js';

export let repo = memoryRepo;

export async function initDb() {
  if (config.mongoUri) {
    const { connectMongo, mongoRepo } = await import('./mongo.js');
    await connectMongo(config.mongoUri);
    repo = mongoRepo;
    console.log('[db] connected to MongoDB (db: quickkart)');
  } else {
    if (config.isProd) console.warn('[db] MONGODB_URI not set - using local JSON store (data is NOT durable).');
    loadMemory();
    repo = memoryRepo;
    console.log('[db] using local JSON store (server/.data/db.json)');
  }
  return repo;
}
