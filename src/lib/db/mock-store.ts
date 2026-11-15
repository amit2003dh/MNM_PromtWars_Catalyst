import { getDeterministicSeedData } from './seed-data';

// Helper to deep clone objects
function deepClone<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;
  return JSON.parse(JSON.stringify(obj));
}

// Helper to evaluate filter condition for a document
function matchesFilter(doc: Record<string, any>, filter: Record<string, any>): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, expected] of Object.entries(filter)) {
    if (key === '$or') {
      if (!Array.isArray(expected)) return false;
      const anyMatch = expected.some((cond) => matchesFilter(doc, cond));
      if (!anyMatch) return false;
      continue;
    }

    if (key === '$and') {
      if (!Array.isArray(expected)) return false;
      const allMatch = expected.every((cond) => matchesFilter(doc, cond));
      if (!allMatch) return false;
      continue;
    }

    const actual = doc[key];

    if (expected !== null && typeof expected === 'object' && !Array.isArray(expected)) {
      // Operator object
      for (const [op, opVal] of Object.entries(expected)) {
        if (op === '$eq' && actual !== opVal) return false;
        if (op === '$ne' && actual === opVal) return false;
        if (op === '$gt' && !(actual > (opVal as any))) return false;
        if (op === '$gte' && !(actual >= (opVal as any))) return false;
        if (op === '$lt' && !(actual < (opVal as any))) return false;
        if (op === '$lte' && !(actual <= (opVal as any))) return false;
        if (op === '$in') {
          if (!Array.isArray(opVal) || !opVal.includes(actual)) return false;
        }
        if (op === '$nin') {
          if (Array.isArray(opVal) && opVal.includes(actual)) return false;
        }
        if (op === '$exists') {
          const exists = actual !== undefined;
          if (exists !== Boolean(opVal)) return false;
        }
        if (op === '$regex') {
          const re = new RegExp(String(opVal), 'i');
          if (!re.test(String(actual || ''))) return false;
        }
      }
    } else {
      // Direct equality check
      if (actual !== expected) return false;
    }
  }

  return true;
}

// Helper to apply MongoDB update object to a document
function applyUpdate(doc: Record<string, any>, update: Record<string, any>): void {
  if (!update) return;

  // Handle $set
  if (update.$set) {
    for (const [field, val] of Object.entries(update.$set)) {
      if (field.includes('.')) {
        const parts = field.split('.');
        let curr = doc;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!curr[parts[i]]) curr[parts[i]] = {};
          curr = curr[parts[i]];
        }
        curr[parts[parts.length - 1]] = deepClone(val);
      } else {
        doc[field] = deepClone(val);
      }
    }
  }

  // Handle $inc
  if (update.$inc) {
    for (const [field, incVal] of Object.entries(update.$inc)) {
      const numInc = Number(incVal) || 0;
      const current = Number(doc[field]) || 0;
      doc[field] = current + numInc;
    }
  }

  // Handle $unset
  if (update.$unset) {
    for (const field of Object.keys(update.$unset)) {
      delete doc[field];
    }
  }

  // Handle $push
  if (update.$push) {
    for (const [field, val] of Object.entries(update.$push)) {
      if (!Array.isArray(doc[field])) {
        doc[field] = [];
      }
      doc[field].push(deepClone(val));
    }
  }

  // Direct set if no operator keys
  const hasOperator = Object.keys(update).some((k) => k.startsWith('$'));
  if (!hasOperator) {
    for (const [k, v] of Object.entries(update)) {
      if (k !== '_id') {
        doc[k] = deepClone(v);
      }
    }
  }
}

export class MockCursor<T = any> {
  private items: T[];
  private sortField?: string;
  private sortAsc = true;
  private limitCount?: number;
  private skipCount = 0;

  constructor(items: T[]) {
    this.items = items;
  }

  sort(sortObj: Record<string, 1 | -1 | 'asc' | 'desc'>): this {
    const key = Object.keys(sortObj)[0];
    if (key) {
      this.sortField = key;
      const val = sortObj[key];
      this.sortAsc = val === 1 || val === 'asc';
    }
    return this;
  }

  limit(limit: number): this {
    this.limitCount = limit;
    return this;
  }

  skip(skip: number): this {
    this.skipCount = skip;
    return this;
  }

  async toArray(): Promise<T[]> {
    let result = [...this.items];

    if (this.sortField) {
      const field = this.sortField;
      const asc = this.sortAsc;
      result.sort((a: any, b: any) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA > valB) return asc ? 1 : -1;
        return asc ? -1 : 1;
      });
    }

    if (this.skipCount > 0) {
      result = result.slice(this.skipCount);
    }

    if (this.limitCount !== undefined && this.limitCount >= 0) {
      result = result.slice(0, this.limitCount);
    }

    return deepClone(result);
  }
}

export class MockCollection<T extends { _id?: any } = any> {
  private name: string;
  private documents: T[] = [];

  constructor(name: string, initialDocs: T[] = []) {
    this.name = name;
    this.documents = deepClone(initialDocs);
  }

  get collectionName(): string {
    return this.name;
  }

  find(filter: Record<string, any> = {}): MockCursor<T> {
    const matched = this.documents.filter((doc) => matchesFilter(doc as Record<string, any>, filter));
    return new MockCursor<T>(matched);
  }

  async findOne(filter: Record<string, any> = {}): Promise<T | null> {
    const found = this.documents.find((doc) => matchesFilter(doc as Record<string, any>, filter));
    return found ? deepClone(found) : null;
  }

  async insertOne(doc: T): Promise<{ acknowledged: boolean; insertedId: any }> {
    const newDoc = deepClone(doc);
    if (!newDoc._id) {
      newDoc._id = `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Enforce unique constraints for mock store (e.g. doseKey on doseEvents, email on users)
    const docAny = newDoc as any;
    if (docAny.doseKey && this.documents.some((d: any) => d.doseKey === docAny.doseKey)) {
      const err: any = new Error(`E11000 duplicate key error collection: carenest.doseEvents index: doseKey_1 dup key: { doseKey: "${docAny.doseKey}" }`);
      err.code = 11000;
      throw err;
    }

    if (this.name === 'users' && docAny.email && this.documents.some((d: any) => d.email === docAny.email)) {
      const err: any = new Error(`E11000 duplicate key error collection: carenest.users index: email_1 dup key: { email: "${docAny.email}" }`);
      err.code = 11000;
      throw err;
    }

    this.documents.push(newDoc);
    return { acknowledged: true, insertedId: newDoc._id };
  }

  async insertMany(docs: T[]): Promise<{ acknowledged: boolean; insertedIds: Record<number, any> }> {
    const insertedIds: Record<number, any> = {};
    for (let idx = 0; idx < docs.length; idx++) {
      const doc = docs[idx];
      const newDoc = deepClone(doc);
      if (!newDoc._id) {
        newDoc._id = `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      const docAny = newDoc as any;
      if (docAny.doseKey && this.documents.some((d: any) => d.doseKey === docAny.doseKey)) {
        const err: any = new Error(`E11000 duplicate key error collection: carenest.doseEvents index: doseKey_1 dup key: { doseKey: "${docAny.doseKey}" }`);
        err.code = 11000;
        throw err;
      }

      this.documents.push(newDoc);
      insertedIds[idx] = newDoc._id;
    }
    return { acknowledged: true, insertedIds };
  }

  async updateOne(
    filter: Record<string, any>,
    update: Record<string, any>,
    options: { upsert?: boolean } = {}
  ): Promise<{ acknowledged: boolean; matchedCount: number; modifiedCount: number; upsertedId?: any }> {
    const doc = this.documents.find((d) => matchesFilter(d as Record<string, any>, filter));
    if (doc) {
      applyUpdate(doc as Record<string, any>, update);
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    }

    if (options.upsert) {
      const newDoc: any = {};
      if (filter._id) newDoc._id = filter._id;
      else newDoc._id = `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      applyUpdate(newDoc, update);
      this.documents.push(newDoc);
      return { acknowledged: true, matchedCount: 0, modifiedCount: 1, upsertedId: newDoc._id };
    }

    return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
  }

  async updateMany(
    filter: Record<string, any>,
    update: Record<string, any>
  ): Promise<{ acknowledged: boolean; matchedCount: number; modifiedCount: number }> {
    const matched = this.documents.filter((d) => matchesFilter(d as Record<string, any>, filter));
    matched.forEach((doc) => applyUpdate(doc as Record<string, any>, update));
    return { acknowledged: true, matchedCount: matched.length, modifiedCount: matched.length };
  }

  async findOneAndUpdate(
    filter: Record<string, any>,
    update: Record<string, any>,
    options: { returnDocument?: 'before' | 'after'; upsert?: boolean } = {}
  ): Promise<T | null> {
    const doc = this.documents.find((d) => matchesFilter(d as Record<string, any>, filter));

    if (doc) {
      const before = deepClone(doc);
      applyUpdate(doc as Record<string, any>, update);
      return options.returnDocument === 'after' ? deepClone(doc) : before;
    }

    if (options.upsert) {
      const newDoc: any = {};
      if (filter._id) newDoc._id = filter._id;
      else newDoc._id = `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      // apply filter fields as defaults
      for (const [k, v] of Object.entries(filter)) {
        if (!k.startsWith('$')) newDoc[k] = deepClone(v);
      }
      applyUpdate(newDoc, update);
      this.documents.push(newDoc);
      return deepClone(newDoc);
    }

    return null;
  }

  async deleteOne(filter: Record<string, any>): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const idx = this.documents.findIndex((d) => matchesFilter(d as Record<string, any>, filter));
    if (idx !== -1) {
      this.documents.splice(idx, 1);
      return { acknowledged: true, deletedCount: 1 };
    }
    return { acknowledged: true, deletedCount: 0 };
  }

  async deleteMany(filter: Record<string, any>): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const initialLength = this.documents.length;
    this.documents = this.documents.filter((d) => !matchesFilter(d as Record<string, any>, filter));
    const deletedCount = initialLength - this.documents.length;
    return { acknowledged: true, deletedCount };
  }

  async countDocuments(filter: Record<string, any> = {}): Promise<number> {
    return this.documents.filter((d) => matchesFilter(d as Record<string, any>, filter)).length;
  }

  async createIndex(_keys: Record<string, any>, _options: Record<string, any> = {}): Promise<string> {
    return 'mock_index';
  }
}

export class MockDatabase {
  private collections: Map<string, MockCollection> = new Map();
  private initialized = false;

  constructor() {
    this.initSeedData();
  }

  private initSeedData() {
    if (this.initialized) return;
    const seed = getDeterministicSeedData();
    this.collections.set('users', new MockCollection('users', seed.users));
    this.collections.set('careProfiles', new MockCollection('careProfiles', seed.careProfiles));
    this.collections.set('careMemberships', new MockCollection('careMemberships', seed.careMemberships));
    this.collections.set('medications', new MockCollection('medications', seed.medications));
    this.collections.set('doseEvents', new MockCollection('doseEvents', seed.doseEvents));
    this.collections.set('appointments', new MockCollection('appointments', seed.appointments));
    this.collections.set('healthLogs', new MockCollection('healthLogs', seed.healthLogs));
    this.collections.set('caregiverNotes', new MockCollection('caregiverNotes', seed.caregiverNotes));
    this.collections.set('notifications', new MockCollection('notifications', seed.notifications));
    this.collections.set('auditLogs', new MockCollection('auditLogs', seed.auditLogs));
    this.initialized = true;
  }

  resetSeedData() {
    this.initialized = false;
    this.collections.clear();
    this.initSeedData();
  }

  collection<TSchema = any>(name: string, _options?: any): any {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection(name));
    }
    return this.collections.get(name);
  }
}

// Global singleton for mock store
declare global {
  // eslint-disable-next-line no-var
  var _mockDatabase: MockDatabase | undefined;
}

export function getMockDatabase(): MockDatabase {
  if (!global._mockDatabase) {
    global._mockDatabase = new MockDatabase();
  }
  return global._mockDatabase;
}
