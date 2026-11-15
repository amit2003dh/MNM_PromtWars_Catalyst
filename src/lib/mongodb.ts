import { getMongoClient, getDatabase, isMockMode } from './db/client';
import { getMockDatabase } from './db/mock-store';

export { getMongoClient, getDatabase, isMockMode };

export const mockDb = {
  getCollection(name: string) {
    return getMockDatabase().collection(name);
  },
};
