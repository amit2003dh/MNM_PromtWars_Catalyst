import { 
  User, 
  CareProfile, 
  CareMembership, 
  Medication, 
  DoseEvent, 
  Appointment, 
  HealthLog, 
  CaregiverNote, 
  NotificationRecord, 
  AuditLog 
} from '@/types';
import { getDbCollection, getDatabase } from './client';
import { MockDatabase } from './mock-store';
import { Db } from 'mongodb';

export const COLLECTIONS = {
  USERS: 'users',
  CARE_PROFILES: 'careProfiles',
  CARE_MEMBERSHIPS: 'careMemberships',
  MEDICATIONS: 'medications',
  DOSE_EVENTS: 'doseEvents',
  APPOINTMENTS: 'appointments',
  HEALTH_LOGS: 'healthLogs',
  CAREGIVER_NOTES: 'caregiverNotes',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'auditLogs',
} as const;

export async function getUsersCollection() {
  return getDbCollection<User>(COLLECTIONS.USERS);
}

export async function getCareProfilesCollection() {
  return getDbCollection<CareProfile>(COLLECTIONS.CARE_PROFILES);
}

export async function getCareMembershipsCollection() {
  return getDbCollection<CareMembership>(COLLECTIONS.CARE_MEMBERSHIPS);
}

export async function getMedicationsCollection() {
  return getDbCollection<Medication>(COLLECTIONS.MEDICATIONS);
}

export async function getDoseEventsCollection() {
  return getDbCollection<DoseEvent>(COLLECTIONS.DOSE_EVENTS);
}

export async function getAppointmentsCollection() {
  return getDbCollection<Appointment>(COLLECTIONS.APPOINTMENTS);
}

export async function getHealthLogsCollection() {
  return getDbCollection<HealthLog>(COLLECTIONS.HEALTH_LOGS);
}

export async function getCaregiverNotesCollection() {
  return getDbCollection<CaregiverNote>(COLLECTIONS.CAREGIVER_NOTES);
}

export async function getNotificationsCollection() {
  return getDbCollection<NotificationRecord>(COLLECTIONS.NOTIFICATIONS);
}

export async function getAuditLogsCollection() {
  return getDbCollection<AuditLog>(COLLECTIONS.AUDIT_LOGS);
}

export async function logAudit(entry: {
  careProfileId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}) {
  try {
    const col = await getAuditLogsCollection();
    const auditRecord: AuditLog = {
      _id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...entry,
      createdAt: new Date().toISOString(),
    };
    await col.insertOne(auditRecord);
  } catch (err) {
    console.error('[CareNest AuditLog] Failed to record audit log:', err);
  }
}

let indexesInitialized = false;

export async function ensureIndexes() {
  if (indexesInitialized) return;

  try {
    const db = await getDatabase();
    if (db instanceof MockDatabase) {
      indexesInitialized = true;
      return;
    }

    const mongoDb = db as Db;

    // Unique index on doseKey to prevent any concurrent double administration race conditions at DB level
    await mongoDb.collection(COLLECTIONS.DOSE_EVENTS).createIndex(
      { doseKey: 1 },
      { unique: true }
    );

    // Indexed queries
    await mongoDb.collection(COLLECTIONS.CARE_MEMBERSHIPS).createIndex(
      { userId: 1, careProfileId: 1 }
    );
    await mongoDb.collection(COLLECTIONS.MEDICATIONS).createIndex(
      { careProfileId: 1, status: 1 }
    );
    await mongoDb.collection(COLLECTIONS.HEALTH_LOGS).createIndex(
      { careProfileId: 1, reportedAt: -1 }
    );
    await mongoDb.collection(COLLECTIONS.CAREGIVER_NOTES).createIndex(
      { careProfileId: 1, createdAt: -1 }
    );
    await mongoDb.collection(COLLECTIONS.APPOINTMENTS).createIndex(
      { careProfileId: 1, dateTime: 1 }
    );
    await mongoDb.collection(COLLECTIONS.USERS).createIndex(
      { email: 1 },
      { unique: true }
    );

    indexesInitialized = true;
  } catch (err) {
    console.warn('[CareNest DB] Index initialization warning:', err);
  }
}
