export type UserRole = 'senior' | 'caregiver' | 'family' | 'owner';

export type HouseholdRole = 'OWNER' | 'FAMILY_COORDINATOR' | 'CAREGIVER' | 'SENIOR' | 'primary_caregiver' | 'caregiver' | 'family' | 'senior';

export type CareMemberRole = 'primary_caregiver' | 'caregiver' | 'family' | 'senior' | 'OWNER' | 'FAMILY_COORDINATOR' | 'CAREGIVER' | 'SENIOR';

export type MedicineCategory = 'allopathic' | 'ayurvedic' | 'herbal' | 'otc';

export type MealRelation = 'before_meal' | 'after_meal' | 'with_meal' | 'empty_stomach' | 'anytime';

export type DoseStatus = 'scheduled' | 'taken' | 'missed' | 'skipped';

export type SymptomType = 
  | 'dizziness' 
  | 'weakness' 
  | 'confusion' 
  | 'drowsiness' 
  | 'stomach_discomfort' 
  | 'feeling_fine' 
  | 'other';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  isPrimary?: boolean;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role?: string;
  avatar?: string;
  emailVerified?: boolean;
  phone?: string;
  passwordHash?: string;
  activeHouseholdId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Household {
  _id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Membership {
  _id: string;
  userId: string;
  householdId: string;
  role: HouseholdRole;
  status: 'active' | 'invited' | 'revoked';
  joinedAt: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export interface OTPVerification {
  _id: string;
  email: string;
  otpHash: string;
  expiresAt: string | Date;
  attempts: number;
  lastSentAt: string | Date;
  verifiedAt?: string | Date;
  createdAt: string | Date;
}

export interface SessionRecord {
  _id: string;
  userId: string;
  householdId: string;
  sessionTokenHash: string;
  expiresAt: string | Date;
  createdAt: string | Date;
}

export interface CareProfile {
  _id: string;
  householdId?: string;
  seniorUserId?: string;
  fullName: string;
  preferredName?: string;
  age: number;
  gender: string;
  bloodGroup?: string;
  emergencyContacts: EmergencyContact[];
  allergies: string[];
  chronicConditions: string[];
  dietaryRestrictions?: string[];
  notes?: string;
  inviteCode?: string;
  inviteCodeHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareMembership {
  _id: string;
  householdId?: string;
  careProfileId: string;
  userId: string;
  role: CareMemberRole;
  status: 'active' | 'invited' | 'revoked';
  invitedBy?: string;
  joinedAt: string;
  createdAt: string;
  userEmail?: string;
  userName?: string;
}

export type MoodType = 'great' | 'good' | 'neutral' | 'tired' | 'unwell';

export interface AdherenceMetrics {
  adherence7Day: number;
  adherence30Day: number;
  perfectStreakDays: number;
  missedPatterns: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
  totalScheduled7d: number;
  totalTaken7d: number;
}

export interface Medication {
  _id: string;
  householdId?: string;
  careProfileId: string;
  medicineName: string;
  medicineCategory: MedicineCategory;
  dosage: string; // e.g. "500mg" or "1 tablet"
  instructions: string; // e.g. "Take with warm water after breakfast"
  frequency: string; // e.g. "daily", "twice_daily", "thrice_daily", "as_needed"
  scheduledTimes: string[]; // e.g. ["08:00", "20:00"]
  mealRelation: MealRelation;
  pillColor: string; // e.g. "White", "Blue", "Yellow"
  pillShape: string; // e.g. "Round", "Oval", "Capsule"
  imageUrl?: string;
  totalQuantity: number;
  remainingQuantity: number;
  refillThreshold: number;
  startDate: string; // ISO date
  endDate?: string;
  status: 'active' | 'pending_approval' | 'rejected' | 'discontinued' | 'tapered' | 'completed';
  reconciliationStatus?: 'CONTINUE' | 'MODIFIED' | 'DISCONTINUED' | 'TAPERED';
  reconciliationNotes?: string;
  // CareCircle Elder Consent Fields
  submittedBy?: string;
  submittedByName?: string;
  submittedByRole?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoseEvent {
  _id: string;
  householdId?: string;
  careProfileId: string;
  medicationId: string;
  doseKey: string; // <careProfileId>_<medicationId>_YYYY-MM-DD_HH:mm
  scheduledAt: string; // ISO UTC
  status: DoseStatus;
  administeredBy?: string; // userId, 'senior', or 'caregiver:Sunita'
  administeredByName?: string;
  recordedAt?: string; // ISO UTC
  notes?: string;
}

export interface Appointment {
  _id: string;
  householdId?: string;
  careProfileId: string;
  doctorName: string;
  specialty: string;
  dateTime: string; // ISO UTC
  location: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthLog {
  _id: string;
  householdId?: string;
  careProfileId: string;
  entryType?: 'symptom' | 'mood' | 'vitals';
  symptom: SymptomType;
  severity: 'mild' | 'moderate' | 'severe';
  mood?: MoodType;
  moodNotes?: string;
  vitals?: {
    bloodPressure?: string;
    pulse?: number;
    bloodGlucose?: number;
  };
  notes?: string;
  reportedBy: string;
  reportedByName?: string;
  reportedAt: string;
}

export interface CaregiverNote {
  _id: string;
  householdId?: string;
  careProfileId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  shiftDate: string; // YYYY-MM-DD
  noteContent: string;
  createdAt: string;
}

export interface NotificationRecord {
  _id: string;
  householdId?: string;
  careProfileId: string;
  recipientId?: string;
  title: string;
  message: string;
  type: 'refill' | 'missed_dose' | 'symptom_alert' | 'appointment' | 'general' | 'appointment_reminder' | 'pending_approval';
  deliveryStatus?: 'sent_email' | 'outbox_preview' | 'in_app';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  stage?: 1 | 2 | 3;
  status: 'unread' | 'read' | 'dismissed';
  sentViaEmail: boolean;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  householdId?: string;
  careProfileId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// Today's unified schedule item for the UI
export interface ScheduleItem {
  doseKey: string;
  householdId?: string;
  medicationId: string;
  medicineName: string;
  medicineCategory: MedicineCategory;
  dosage: string;
  instructions: string;
  scheduledTime: string; // HH:mm
  scheduledAt: string; // ISO UTC
  mealRelation: MealRelation;
  pillColor: string;
  pillShape: string;
  status: DoseStatus;
  doseEventId?: string;
  administeredBy?: string;
  administeredByName?: string;
  recordedAt?: string;
  remainingQuantity: number;
}

export interface AuthSession {
  user: User;
  household?: Household;
  householdId?: string;
  role?: string;
  memberships: (Membership | CareMembership)[];
  activeProfile?: CareProfile;
}
