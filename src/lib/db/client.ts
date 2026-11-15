import { MongoClient, Db } from 'mongodb';
import { getMockDatabase, MockDatabase, MockCollection } from './mock-store';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'carenest';

let mongoClientPromise: Promise<MongoClient> | null = null;
let useMock = false;

// Check if URI is explicitly provided and not a placeholder template
function isValidMongoUri(targetUri?: string): boolean {
  if (!targetUri) return false;
  if (targetUri.includes('username:password') || targetUri.includes('<password>')) return false;
  if (!targetUri.startsWith('mongodb://') && !targetUri.startsWith('mongodb+srv://')) return false;
  return true;
}

declare global {
  // eslint-disable-next-line no-var
  var _cachedMongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMockMode(): boolean {
  return useMock || !isValidMongoUri(uri);
}

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!isValidMongoUri(uri)) {
    useMock = true;
    return null;
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      if (!global._cachedMongoClientPromise) {
        const client = new MongoClient(uri!, {
          serverSelectionTimeoutMS: 2000,
          connectTimeoutMS: 2000,
        });
        global._cachedMongoClientPromise = client.connect();
      }
      return await global._cachedMongoClientPromise;
    } else {
      if (!mongoClientPromise) {
        const client = new MongoClient(uri!, {
          serverSelectionTimeoutMS: 2000,
          connectTimeoutMS: 2000,
        });
        mongoClientPromise = client.connect();
      }
      return await mongoClientPromise;
    }
  } catch (err) {
    console.warn('[CareNest DB] Failed to connect to MongoDB, falling back to in-memory store:', err);
    useMock = true;
    return null;
  }
}

export async function getDatabase(): Promise<Db | MockDatabase> {
  if (isMockMode()) {
    return getMockDatabase();
  }

  try {
    const client = await getMongoClient();
    if (client) {
      return client.db(dbName);
    }
  } catch (err) {
    console.warn('[CareNest DB] Error getting MongoDB database, falling back to mock DB:', err);
  }

  useMock = true;
  return getMockDatabase();
}

export async function getDbCollection<T extends { _id?: any } = any>(
  collectionName: string
): Promise<any> {
  const db = await getDatabase();
  if (db instanceof MockDatabase) {
    return db.collection(collectionName);
  }
  return (db as Db).collection(collectionName);
}
