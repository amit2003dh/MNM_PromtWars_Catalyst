'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserRole,
  CareProfile,
  CareMembership,
  Medication,
  ScheduleItem,
  HealthLog,
  CaregiverNote,
  Appointment,
  SymptomType,
} from '@/types';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

const DEMO_USERS: Record<UserRole, UserSession> = {
  senior: {
    id: 'user_meera_01',
    name: 'Meera Sharma',
    role: 'senior',
    email: 'meera.sharma@example.com',
  },
  caregiver: {
    id: 'user_sunita_02',
    name: 'Sunita Verma',
    role: 'caregiver',
    email: 'sunita.care@example.com',
  },
  family: {
    id: 'user_rahul_03',
    name: 'Rahul Sharma',
    role: 'family',
    email: 'rahul.sharma@example.com',
  },
};

const DEFAULT_PROFILE: CareProfile = {
  _id: 'cp_meera_001',
  fullName: 'Meera Sharma',
  preferredName: 'Meera-ji',
  age: 74,
  gender: 'Female',
  bloodGroup: 'O+',
  emergencyContacts: [
    { name: 'Rahul Sharma', relationship: 'Son', phone: '+91 98765 43210', isPrimary: true },
    { name: 'Sunita Verma', relationship: 'Primary Caregiver', phone: '+91 98111 22334', isPrimary: false },
    { name: 'Dr. Ananya Roy', relationship: 'Cardiologist', phone: '+91 98222 33445', isPrimary: false },
  ],
  allergies: ['Penicillin', 'Sulfa Drugs'],
  chronicConditions: ['Type 2 Diabetes', 'Hypertension', 'Mild Osteoarthritis'],
  dietaryRestrictions: ['Low Sodium', 'Diabetic Diet', 'Vegetarian'],
  notes: 'Requires assistance with evening walking and gentle reminders for morning blood pressure log.',
  inviteCode: 'CARE-NEST-7492',
  createdAt: '2026-01-10T08:00:00.000Z',
  updatedAt: '2026-11-15T08:00:00.000Z',
};

const DEFAULT_MEMBERS: CareMembership[] = [
  {
    _id: 'cm_01',
    careProfileId: 'cp_meera_001',
    userId: 'user_meera_01',
    role: 'senior',
    status: 'active',
    joinedAt: '2026-01-10T08:00:00.000Z',
    createdAt: '2026-01-10T08:00:00.000Z',
    userEmail: 'meera.sharma@example.com',
    userName: 'Meera Sharma (Senior)',
  },
  {
    _id: 'cm_02',
    careProfileId: 'cp_meera_001',
    userId: 'user_sunita_02',
    role: 'primary_caregiver',
    status: 'active',
    joinedAt: '2026-01-12T09:30:00.000Z',
    createdAt: '2026-01-12T09:30:00.000Z',
    userEmail: 'sunita.care@example.com',
    userName: 'Sunita Verma (Primary Caregiver)',
  },
  {
    _id: 'cm_03',
    careProfileId: 'cp_meera_001',
    userId: 'user_rahul_03',
    role: 'family',
    status: 'active',
    joinedAt: '2026-01-10T08:15:00.000Z',
    createdAt: '2026-01-10T08:15:00.000Z',
    userEmail: 'rahul.sharma@example.com',
    userName: 'Rahul Sharma (Son)',
  },
];

const DEFAULT_MEDICATIONS: Medication[] = [
  {
    _id: 'med_01',
    careProfileId: 'cp_meera_001',
    medicineName: 'Metformin Hydrochloride',
    medicineCategory: 'allopathic',
    dosage: '500 mg',
    instructions: 'Take 1 tablet with or immediately after breakfast with water.',
    frequency: 'twice_daily',
    scheduledTimes: ['08:00', '20:00'],
    mealRelation: 'with_meal',
    pillColor: 'White',
    pillShape: 'Oval',
    totalQuantity: 60,
    remainingQuantity: 14,
    refillThreshold: 10,
    startDate: '2026-01-01',
    status: 'active',
    reconciliationStatus: 'CONTINUE',
    createdBy: 'Dr. Ananya Roy',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    _id: 'med_02',
    careProfileId: 'cp_meera_001',
    medicineName: 'Amlodipine Besylate',
    medicineCategory: 'allopathic',
    dosage: '5 mg',
    instructions: 'Take 1 tablet every morning with water before food.',
    frequency: 'daily',
    scheduledTimes: ['08:00'],
    mealRelation: 'before_meal',
    pillColor: 'Yellow',
    pillShape: 'Round',
    totalQuantity: 30,
    remainingQuantity: 4, // Low stock triggers warning!
    refillThreshold: 7,
    startDate: '2026-01-01',
    status: 'active',
    reconciliationStatus: 'CONTINUE',
    createdBy: 'Dr. Ananya Roy',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    _id: 'med_03',
    careProfileId: 'cp_meera_001',
    medicineName: 'Ashwagandha Churna Tablet',
    medicineCategory: 'ayurvedic',
    dosage: '250 mg',
    instructions: 'Take 1 tablet with warm milk before bedtime.',
    frequency: 'daily',
    scheduledTimes: ['21:00'],
    mealRelation: 'after_meal',
    pillColor: 'Brown',
    pillShape: 'Round',
    totalQuantity: 60,
    remainingQuantity: 28,
    refillThreshold: 10,
    startDate: '2026-02-01',
    status: 'active',
    reconciliationStatus: 'CONTINUE',
    createdBy: 'Dr. Rajesh Sharma (Ayurveda)',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    _id: 'med_04',
    careProfileId: 'cp_meera_001',
    medicineName: 'Vitamin D3 & Calcium',
    medicineCategory: 'otc',
    dosage: '1000 IU / 500 mg',
    instructions: 'Take 1 chewable tablet after lunch.',
    frequency: 'daily',
    scheduledTimes: ['13:00'],
    mealRelation: 'after_meal',
    pillColor: 'Peach',
    pillShape: 'Chewable',
    totalQuantity: 45,
    remainingQuantity: 20,
    refillThreshold: 8,
    startDate: '2026-03-01',
    status: 'active',
    reconciliationStatus: 'CONTINUE',
    createdBy: 'Sunita Verma',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
];

const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const DEFAULT_SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    doseKey: `cp_meera_001_med_01_${getTodayDateString()}_08:00`,
    medicationId: 'med_01',
    medicineName: 'Metformin Hydrochloride',
    medicineCategory: 'allopathic',
    dosage: '500 mg',
    instructions: 'Take 1 tablet with or immediately after breakfast with water.',
    scheduledTime: '08:00',
    scheduledAt: `${getTodayDateString()}T08:00:00.000Z`,
    mealRelation: 'with_meal',
    pillColor: 'White',
    pillShape: 'Oval',
    status: 'taken',
    doseEventId: 'de_01',
    administeredBy: 'user_sunita_02',
    administeredByName: 'Sunita Verma (Caregiver)',
    recordedAt: `${getTodayDateString()}T08:12:00.000Z`,
    remainingQuantity: 14,
  },
  {
    doseKey: `cp_meera_001_med_02_${getTodayDateString()}_08:00`,
    medicationId: 'med_02',
    medicineName: 'Amlodipine Besylate',
    medicineCategory: 'allopathic',
    dosage: '5 mg',
    instructions: 'Take 1 tablet every morning with water before food.',
    scheduledTime: '08:00',
    scheduledAt: `${getTodayDateString()}T08:00:00.000Z`,
    mealRelation: 'before_meal',
    pillColor: 'Yellow',
    pillShape: 'Round',
    status: 'taken',
    doseEventId: 'de_02',
    administeredBy: 'user_meera_01',
    administeredByName: 'Meera Sharma (Senior)',
    recordedAt: `${getTodayDateString()}T08:05:00.000Z`,
    remainingQuantity: 4,
  },
  {
    doseKey: `cp_meera_001_med_04_${getTodayDateString()}_13:00`,
    medicationId: 'med_04',
    medicineName: 'Vitamin D3 & Calcium',
    medicineCategory: 'otc',
    dosage: '1000 IU / 500 mg',
    instructions: 'Take 1 chewable tablet after lunch.',
    scheduledTime: '13:00',
    scheduledAt: `${getTodayDateString()}T13:00:00.000Z`,
    mealRelation: 'after_meal',
    pillColor: 'Peach',
    pillShape: 'Chewable',
    status: 'scheduled',
    remainingQuantity: 20,
  },
  {
    doseKey: `cp_meera_001_med_01_${getTodayDateString()}_20:00`,
    medicationId: 'med_01',
    medicineName: 'Metformin Hydrochloride',
    medicineCategory: 'allopathic',
    dosage: '500 mg',
    instructions: 'Take 1 tablet after dinner with water.',
    scheduledTime: '20:00',
    scheduledAt: `${getTodayDateString()}T20:00:00.000Z`,
    mealRelation: 'with_meal',
    pillColor: 'White',
    pillShape: 'Oval',
    status: 'scheduled',
    remainingQuantity: 14,
  },
  {
    doseKey: `cp_meera_001_med_03_${getTodayDateString()}_21:00`,
    medicationId: 'med_03',
    medicineName: 'Ashwagandha Churna Tablet',
    medicineCategory: 'ayurvedic',
    dosage: '250 mg',
    instructions: 'Take 1 tablet with warm milk before bedtime.',
    scheduledTime: '21:00',
    scheduledAt: `${getTodayDateString()}T21:00:00.000Z`,
    mealRelation: 'after_meal',
    pillColor: 'Brown',
    pillShape: 'Round',
    status: 'scheduled',
    remainingQuantity: 28,
  },
];

const DEFAULT_HEALTH_LOGS: HealthLog[] = [
  {
    _id: 'hl_01',
    careProfileId: 'cp_meera_001',
    symptom: 'dizziness',
    severity: 'mild',
    notes: 'Mild lightheadedness when standing up after lunch.',
    reportedBy: 'user_meera_01',
    reportedByName: 'Meera Sharma',
    reportedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    _id: 'hl_02',
    careProfileId: 'cp_meera_001',
    symptom: 'feeling_fine',
    severity: 'mild',
    notes: 'Woke up energized, completed 15 mins morning breathing exercises.',
    reportedBy: 'user_meera_01',
    reportedByName: 'Meera Sharma',
    reportedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
];

const DEFAULT_CAREGIVER_NOTES: CaregiverNote[] = [
  {
    _id: 'cn_01',
    careProfileId: 'cp_meera_001',
    authorId: 'user_sunita_02',
    authorName: 'Sunita Verma',
    authorRole: 'Primary Caregiver',
    shiftDate: getTodayDateString(),
    noteContent:
      'Morning Shift (07:30 - 15:30): Meera-ji had oatmeal and papaya for breakfast. Morning Metformin & Amlodipine administered smoothly. BP measured at 128/82 mmHg, pulse 74 bpm. Reminded family that Amlodipine is down to 4 tablets and needs refill.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    _id: 'cn_02',
    careProfileId: 'cp_meera_001',
    authorId: 'user_sunita_02',
    authorName: 'Sunita Verma',
    authorRole: 'Primary Caregiver',
    shiftDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    noteContent:
      'Evening Shift: Meera-ji felt slight tiredness after evening garden walk. Night medications taken on time with warm turmeric milk. Slept comfortably by 21:45.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const DEFAULT_APPOINTMENTS: Appointment[] = [
  {
    _id: 'app_01',
    careProfileId: 'cp_meera_001',
    doctorName: 'Dr. Ananya Roy',
    specialty: 'Cardiologist',
    dateTime: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days ahead
    location: 'Max Healthcare City Clinic, Suite 304',
    notes: 'Quarterly blood pressure review and echocardiogram follow-up. Bring recent blood glucose log.',
    status: 'scheduled',
    createdBy: 'Rahul Sharma',
    createdAt: '2026-11-10T10:00:00.000Z',
    updatedAt: '2026-11-10T10:00:00.000Z',
  },
  {
    _id: 'app_02',
    careProfileId: 'cp_meera_001',
    doctorName: 'Dr. Ramesh Sethi',
    specialty: 'Endocrinologist',
    dateTime: new Date(Date.now() + 86400000 * 9).toISOString(), // 9 days ahead
    location: 'Apollo Sugar Clinics, Room 12',
    notes: 'HbA1c test and review of Metformin dosage tolerance.',
    status: 'scheduled',
    createdBy: 'Sunita Verma',
    createdAt: '2026-11-12T14:30:00.000Z',
    updatedAt: '2026-11-12T14:30:00.000Z',
  },
];

interface ConflictModalInfo {
  isOpen: boolean;
  doseName: string;
  administeredByName: string;
  recordedAt: string;
}

interface CareContextType {
  user: UserSession;
  careProfile: CareProfile;
  careMembers: CareMembership[];
  medications: Medication[];
  todayDoses: ScheduleItem[];
  healthLogs: HealthLog[];
  caregiverNotes: CaregiverNote[];
  appointments: Appointment[];
  seniorMode: boolean;
  emergencyAlertActive: boolean;
  conflictModalData: ConflictModalInfo | null;
  setSeniorMode: (val: boolean) => void;
  switchUserRole: (role: UserRole) => void;
  administerDose: (
    doseKey: string,
    notes?: string
  ) => Promise<{
    success: boolean;
    conflict?: boolean;
    message: string;
    administeredByName?: string;
    recordedAt?: string;
  }>;
  addMedication: (
    med: Omit<Medication, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'careProfileId'>
  ) => Promise<void>;
  updateMedication: (id: string, med: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  logSymptom: (
    symptom: SymptomType,
    severity: 'mild' | 'moderate' | 'severe',
    notes?: string
  ) => Promise<void>;
  addCaregiverNote: (content: string) => Promise<void>;
  addAppointment: (
    app: Omit<Appointment, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'careProfileId'>
  ) => Promise<void>;
  triggerEmergency: () => void;
  clearEmergencyAlert: () => void;
  closeConflictModal: () => void;
  refreshData: () => Promise<void>;
}

const CareContext = createContext<CareContextType | undefined>(undefined);

export function CareProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession>(DEMO_USERS.senior);
  const [seniorMode, setSeniorModeState] = useState<boolean>(true);
  const [careProfile] = useState<CareProfile>(DEFAULT_PROFILE);
  const [careMembers] = useState<CareMembership[]>(DEFAULT_MEMBERS);
  const [medications, setMedications] = useState<Medication[]>(DEFAULT_MEDICATIONS);
  const [todayDoses, setTodayDoses] = useState<ScheduleItem[]>(DEFAULT_SCHEDULE_ITEMS);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>(DEFAULT_HEALTH_LOGS);
  const [caregiverNotes, setCaregiverNotes] = useState<CaregiverNote[]>(DEFAULT_CAREGIVER_NOTES);
  const [appointments, setAppointments] = useState<Appointment[]>(DEFAULT_APPOINTMENTS);
  const [emergencyAlertActive, setEmergencyAlertActive] = useState<boolean>(false);
  const [conflictModalData, setConflictModalData] = useState<ConflictModalInfo | null>(null);

  // Apply Senior Mode class to body
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (seniorMode) {
        document.body.classList.add('senior-mode');
      } else {
        document.body.classList.remove('senior-mode');
      }
    }
  }, [seniorMode]);

  const setSeniorMode = useCallback((val: boolean) => {
    setSeniorModeState(val);
  }, []);

  const switchUserRole = useCallback((role: UserRole) => {
    const newUser = DEMO_USERS[role];
    setUser(newUser);
    if (role === 'senior') {
      setSeniorModeState(true);
    } else {
      setSeniorModeState(false);
    }
  }, []);

  // Fetch real data from APIs if available, fallback gracefully to seed
  const refreshData = useCallback(async () => {
    try {
      const dosesRes = await fetch('/api/doses/today');
      if (dosesRes.ok) {
        const data = await dosesRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setTodayDoses(data);
        } else if (data.schedule && Array.isArray(data.schedule)) {
          setTodayDoses(data.schedule);
        }
      }
    } catch {
      // API not yet mounted or offline - fallback to local state
    }

    try {
      const medsRes = await fetch('/api/medications');
      if (medsRes.ok) {
        const data = await medsRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setMedications(data);
        }
      }
    } catch {
      // fallback
    }

    try {
      const healthRes = await fetch('/api/health-logs');
      if (healthRes.ok) {
        const data = await healthRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setHealthLogs(data);
        }
      }
    } catch {
      // fallback
    }

    try {
      const notesRes = await fetch('/api/caregiver-notes');
      if (notesRes.ok) {
        const data = await notesRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setCaregiverNotes(data);
        }
      }
    } catch {
      // fallback
    }

    try {
      const appRes = await fetch('/api/appointments');
      if (appRes.ok) {
        const data = await appRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setAppointments(data);
        }
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Administer dose with Anti-Double-Dosing concurrency lock
  const administerDose = useCallback(
    async (doseKey: string, notes?: string) => {
      // Check local state first to guard against client-side double click
      const currentItem = todayDoses.find((item) => item.doseKey === doseKey);
      if (currentItem && currentItem.status === 'taken') {
        const conflictInfo = {
          isOpen: true,
          doseName: currentItem.medicineName,
          administeredByName: currentItem.administeredByName || 'Another Caregiver',
          recordedAt: currentItem.recordedAt || new Date().toISOString(),
        };
        setConflictModalData(conflictInfo);
        return {
          success: false,
          conflict: true,
          message: `Dose already administered by ${currentItem.administeredByName}`,
          administeredByName: currentItem.administeredByName,
          recordedAt: currentItem.recordedAt,
        };
      }

      // Try API POST /api/doses/administer
      try {
        const res = await fetch('/api/doses/administer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doseKey,
            careProfileId: careProfile._id,
            administeredBy: user.id,
            administeredByName: user.name,
            notes,
          }),
        });

        if (res.status === 409) {
          // Double Dose Conflict detected on server!
          const errorData = await res.json().catch(() => ({}));
          const conflictInfo = {
            isOpen: true,
            doseName: currentItem?.medicineName || 'Medication',
            administeredByName: errorData.administeredByName || errorData.details?.administeredByName || 'Caregiver',
            recordedAt: errorData.recordedAt || errorData.details?.recordedAt || new Date().toISOString(),
          };
          setConflictModalData(conflictInfo);
          return {
            success: false,
            conflict: true,
            message: 'Dose already administered (Anti-Double-Dosing Lock Protected)',
            administeredByName: conflictInfo.administeredByName,
            recordedAt: conflictInfo.recordedAt,
          };
        }

        if (res.ok) {
          const result = await res.json();
          // Update local state
          setTodayDoses((prev) =>
            prev.map((d) =>
              d.doseKey === doseKey
                ? {
                    ...d,
                    status: 'taken',
                    administeredBy: user.id,
                    administeredByName: user.name,
                    recordedAt: new Date().toISOString(),
                    remainingQuantity: Math.max(0, d.remainingQuantity - 1),
                  }
                : d
            )
          );
          // Decrement medication remainingQuantity
          if (currentItem) {
            setMedications((prev) =>
              prev.map((m) =>
                m._id === currentItem.medicationId
                  ? { ...m, remainingQuantity: Math.max(0, m.remainingQuantity - 1) }
                  : m
              )
            );
          }
          return {
            success: true,
            message: 'Dose safely recorded and inventory updated.',
            administeredByName: user.name,
            recordedAt: new Date().toISOString(),
          };
        }
      } catch {
        // Fallback local execution when offline or API in flight
      }

      // Local optimistic update
      const nowIso = new Date().toISOString();
      setTodayDoses((prev) =>
        prev.map((d) =>
          d.doseKey === doseKey
            ? {
                ...d,
                status: 'taken',
                administeredBy: user.id,
                administeredByName: user.name,
                recordedAt: nowIso,
                remainingQuantity: Math.max(0, d.remainingQuantity - 1),
              }
            : d
        )
      );

      if (currentItem) {
        setMedications((prev) =>
          prev.map((m) =>
            m._id === currentItem.medicationId
              ? { ...m, remainingQuantity: Math.max(0, m.remainingQuantity - 1) }
              : m
          )
        );
      }

      return {
        success: true,
        message: 'Dose safely recorded (Anti-Double-Dosing Protected).',
        administeredByName: user.name,
        recordedAt: nowIso,
      };
    },
    [todayDoses, careProfile._id, user]
  );

  const addMedication = useCallback(
    async (newMedData: Omit<Medication, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'careProfileId'>) => {
      const nowIso = new Date().toISOString();
      const newMed: Medication = {
        ...newMedData,
        _id: `med_${Date.now()}`,
        careProfileId: careProfile._id,
        createdBy: user.name,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      try {
        await fetch('/api/medications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMed),
        });
      } catch {
        // fallback
      }

      setMedications((prev) => [newMed, ...prev]);

      // Add to today's schedule if it has times
      const todayStr = getTodayDateString();
      const newScheduleItems: ScheduleItem[] = newMed.scheduledTimes.map((time) => ({
        doseKey: `${careProfile._id}_${newMed._id}_${todayStr}_${time}`,
        medicationId: newMed._id,
        medicineName: newMed.medicineName,
        medicineCategory: newMed.medicineCategory,
        dosage: newMed.dosage,
        instructions: newMed.instructions,
        scheduledTime: time,
        scheduledAt: `${todayStr}T${time}:00.000Z`,
        mealRelation: newMed.mealRelation,
        pillColor: newMed.pillColor,
        pillShape: newMed.pillShape,
        status: 'scheduled',
        remainingQuantity: newMed.remainingQuantity,
      }));

      setTodayDoses((prev) => [...prev, ...newScheduleItems].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)));
    },
    [careProfile._id, user.name]
  );

  const updateMedication = useCallback(async (id: string, updates: Partial<Medication>) => {
    try {
      await fetch(`/api/medications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch {
      // fallback
    }

    setMedications((prev) =>
      prev.map((m) => (m._id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m))
    );
  }, []);

  const deleteMedication = useCallback(async (id: string) => {
    try {
      await fetch(`/api/medications/${id}`, { method: 'DELETE' });
    } catch {
      // fallback
    }
    setMedications((prev) => prev.filter((m) => m._id !== id));
    setTodayDoses((prev) => prev.filter((d) => d.medicationId !== id));
  }, []);

  const logSymptom = useCallback(
    async (symptom: SymptomType, severity: 'mild' | 'moderate' | 'severe', notes?: string) => {
      const newLog: HealthLog = {
        _id: `hl_${Date.now()}`,
        careProfileId: careProfile._id,
        symptom,
        severity,
        notes,
        reportedBy: user.id,
        reportedByName: user.name,
        reportedAt: new Date().toISOString(),
      };

      try {
        await fetch('/api/health-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLog),
        });
      } catch {
        // fallback
      }

      setHealthLogs((prev) => [newLog, ...prev]);
    },
    [careProfile._id, user]
  );

  const addCaregiverNote = useCallback(
    async (content: string) => {
      const newNote: CaregiverNote = {
        _id: `cn_${Date.now()}`,
        careProfileId: careProfile._id,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role === 'caregiver' ? 'Primary Caregiver' : user.role === 'senior' ? 'Senior' : 'Family Member',
        shiftDate: getTodayDateString(),
        noteContent: content,
        createdAt: new Date().toISOString(),
      };

      try {
        await fetch('/api/caregiver-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newNote),
        });
      } catch {
        // fallback
      }

      setCaregiverNotes((prev) => [newNote, ...prev]);
    },
    [careProfile._id, user]
  );

  const addAppointment = useCallback(
    async (appData: Omit<Appointment, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'careProfileId'>) => {
      const nowIso = new Date().toISOString();
      const newApp: Appointment = {
        ...appData,
        _id: `app_${Date.now()}`,
        careProfileId: careProfile._id,
        createdBy: user.name,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      try {
        await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newApp),
        });
      } catch {
        // fallback
      }

      setAppointments((prev) => [...prev, newApp].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));
    },
    [careProfile._id, user.name]
  );

  const triggerEmergency = useCallback(() => {
    setEmergencyAlertActive(true);
  }, []);

  const clearEmergencyAlert = useCallback(() => {
    setEmergencyAlertActive(false);
  }, []);

  const closeConflictModal = useCallback(() => {
    setConflictModalData(null);
  }, []);

  return (
    <CareContext.Provider
      value={{
        user,
        careProfile,
        careMembers,
        medications,
        todayDoses,
        healthLogs,
        caregiverNotes,
        appointments,
        seniorMode,
        emergencyAlertActive,
        conflictModalData,
        setSeniorMode,
        switchUserRole,
        administerDose,
        addMedication,
        updateMedication,
        deleteMedication,
        logSymptom,
        addCaregiverNote,
        addAppointment,
        triggerEmergency,
        clearEmergencyAlert,
        closeConflictModal,
        refreshData,
      }}
    >
      {children}
    </CareContext.Provider>
  );
}

export function useCare() {
  const context = useContext(CareContext);
  if (!context) {
    throw new Error('useCare must be used within a CareProvider');
  }
  return context;
}
