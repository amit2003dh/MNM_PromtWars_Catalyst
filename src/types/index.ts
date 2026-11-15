export type UserRole = 'senior' | 'caregiver' | 'family';

export type CareMemberRole = 'primary_caregiver' | 'caregiver' | 'family' | 'senior';

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

export interface CareProfile {
  _id: string;
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

export interface Medication {
  _id: string;
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
  status: 'active' | 'discontinued' | 'tapered' | 'completed';
  reconciliationStatus?: 'CONTINUE' | 'MODIFIED' | 'DISCONTINUED' | 'TAPERED';
  reconciliationNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoseEvent {
  _id: string;
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
  careProfileId: string;
  symptom: SymptomType;
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
  reportedBy: string;
  reportedByName?: string;
  reportedAt: string;
}

export interface CaregiverNote {
  _id: string;
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
  careProfileId: string;
  recipientId?: string;
  title: string;
  message: string;
  type: 'refill' | 'missed_dose' | 'symptom_alert' | 'appointment' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  stage?: 1 | 2 | 3;
  status: 'unread' | 'read' | 'dismissed';
  sentViaEmail: boolean;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
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
