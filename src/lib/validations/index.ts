import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['senior', 'caregiver', 'family']),
  phone: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const EmergencyContactSchema = z.object({
  name: z.string().min(1, 'Contact name required'),
  relationship: z.string().min(1, 'Relationship required'),
  phone: z.string().min(5, 'Valid phone number required'),
  isPrimary: z.boolean().optional(),
});

export const CareProfileCreateSchema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  preferredName: z.string().optional(),
  age: z.number().int().min(1).max(130),
  gender: z.string().min(1),
  bloodGroup: z.string().optional(),
  emergencyContacts: z.array(EmergencyContactSchema).min(1, 'At least one emergency contact is required'),
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  dietaryRestrictions: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const CareProfileUpdateSchema = CareProfileCreateSchema.partial();

export const JoinCareCircleSchema = z.object({
  inviteCode: z.string().min(3, 'Invite code is required'),
  role: z.enum(['senior', 'caregiver', 'family', 'primary_caregiver']).optional(),
});

export const MedicationCreateSchema = z.object({
  careProfileId: z.string().min(1, 'Care Profile ID is required'),
  medicineName: z.string().min(1, 'Medicine name is required'),
  medicineCategory: z.enum(['allopathic', 'ayurvedic', 'herbal', 'otc']),
  dosage: z.string().min(1, 'Dosage is required (e.g. 500mg)'),
  instructions: z.string().min(1, 'Instructions are required'),
  frequency: z.string().min(1, 'Frequency is required'),
  scheduledTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time format must be HH:mm (24hr)')).min(1, 'At least one scheduled time is required'),
  mealRelation: z.enum(['before_meal', 'after_meal', 'with_meal', 'empty_stomach', 'anytime']),
  pillColor: z.string().min(1, 'Pill color is required'),
  pillShape: z.string().min(1, 'Pill shape is required'),
  imageUrl: z.string().optional(),
  totalQuantity: z.number().int().min(0, 'Total quantity cannot be negative'),
  remainingQuantity: z.number().int().min(0, 'Remaining quantity cannot be negative'),
  refillThreshold: z.number().int().min(0, 'Refill threshold cannot be negative'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  status: z.enum(['active', 'discontinued', 'tapered', 'completed']).default('active'),
  reconciliationStatus: z.enum(['CONTINUE', 'MODIFIED', 'DISCONTINUED', 'TAPERED']).optional(),
  reconciliationNotes: z.string().optional(),
});

export const MedicationUpdateSchema = MedicationCreateSchema.partial().omit({ careProfileId: true });

export const AdministerDoseSchema = z.object({
  careProfileId: z.string().min(1, 'Care Profile ID required'),
  medicationId: z.string().min(1, 'Medication ID required'),
  doseKey: z.string().min(5, 'Valid doseKey required'),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['taken', 'missed', 'skipped']).default('taken'),
});

export const HealthLogCreateSchema = z.object({
  careProfileId: z.string().min(1, 'Care Profile ID required'),
  symptom: z.enum([
    'dizziness',
    'weakness',
    'confusion',
    'drowsiness',
    'stomach_discomfort',
    'feeling_fine',
    'other',
  ]),
  severity: z.enum(['mild', 'moderate', 'severe']),
  notes: z.string().optional(),
});

export const CaregiverNoteCreateSchema = z.object({
  careProfileId: z.string().min(1, 'Care Profile ID required'),
  shiftDate: z.string().optional(),
  noteContent: z.string().min(1, 'Note content cannot be empty'),
});

export const AppointmentCreateSchema = z.object({
  careProfileId: z.string().min(1, 'Care Profile ID required'),
  doctorName: z.string().min(1, 'Doctor name required'),
  specialty: z.string().min(1, 'Specialty required'),
  dateTime: z.string().min(1, 'Appointment date/time required'),
  location: z.string().min(1, 'Location required'),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).default('scheduled'),
});

export const AppointmentUpdateSchema = AppointmentCreateSchema.partial().omit({ careProfileId: true });
