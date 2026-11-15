import { getDatabase } from '../mongodb';
import { getMockDatabase } from '../db/mock-store';
import { 
  CareProfile, 
  Medication, 
  DoseEvent, 
  HealthLog, 
  CaregiverNote, 
  Appointment,
  NotificationRecord 
} from '../../types';

export interface DbCollections {
  careProfiles: any;
  careMemberships: any;
  medications: any;
  doseEvents: any;
  healthLogs: any;
  caregiverNotes: any;
  appointments: any;
  notifications: any;
  auditLogs: any;
}

/**
 * Resolves the operational database — MongoDB if connected, or the pre-seeded in-memory MockDatabase.
 */
export async function getCareNestDb(): Promise<DbCollections> {
  const uri = process.env.MONGODB_URI;
  const isRealMongo = uri && 
    uri.trim() !== '' && 
    !uri.includes('username:password') && 
    !uri.includes('your-mongodb-uri');

  if (isRealMongo) {
    try {
      const db = await getDatabase();
      const rawDb = db as any;
      return {
        careProfiles: rawDb.collection('careProfiles'),
        careMemberships: rawDb.collection('careMemberships'),
        medications: rawDb.collection('medications'),
        doseEvents: rawDb.collection('doseEvents'),
        healthLogs: rawDb.collection('healthLogs'),
        caregiverNotes: rawDb.collection('caregiverNotes'),
        appointments: rawDb.collection('appointments'),
        notifications: rawDb.collection('notifications'),
        auditLogs: rawDb.collection('auditLogs'),
      };
    } catch (err) {
      console.warn('[CareNest DB] Failed to connect to MongoDB, using seed mock store fallback:', err);
    }
  }

  // Fallback to mock database pre-seeded with Meera Sharma, Sunita, Rahul
  const mockDb = getMockDatabase();
  return {
    careProfiles: mockDb.collection('careProfiles'),
    careMemberships: mockDb.collection('careMemberships'),
    medications: mockDb.collection('medications'),
    doseEvents: mockDb.collection('doseEvents'),
    healthLogs: mockDb.collection('healthLogs'),
    caregiverNotes: mockDb.collection('caregiverNotes'),
    appointments: mockDb.collection('appointments'),
    notifications: mockDb.collection('notifications'),
    auditLogs: mockDb.collection('auditLogs'),
  };
}
