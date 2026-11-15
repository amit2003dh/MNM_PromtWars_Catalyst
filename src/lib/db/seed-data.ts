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

// Deterministic IDs
export const SEED_IDS = {
  USER_MEERA: 'user_meera_01',
  USER_SUNITA: 'user_sunita_02',
  USER_RAHUL: 'user_rahul_03',
  PROFILE_MEERA: 'profile_meera_sharma_01',
  MEMBERSHIP_MEERA: 'membership_meera_01',
  MEMBERSHIP_SUNITA: 'membership_sunita_02',
  MEMBERSHIP_RAHUL: 'membership_rahul_03',
  MED_METFORMIN: 'med_metformin_01',
  MED_AMLODIPINE: 'med_amlodipine_02',
  MED_ASHWAGANDHA: 'med_ashwagandha_03',
  MED_CALCIUM: 'med_calcium_04',
  INVITE_PASSCODE: 'NEST72',
  // bcrypt hash for 'password123'
  PASSWORD_HASH: '$2a$10$M.kvAcyjizSKwApJzVGrcOkkvWLEURdsYnBRrMkcuvMl3OsXnhzwm',
  // bcrypt hash for 'NEST72'
  PASSCODE_HASH: '$2a$10$HVnhF0e0nRJL4K7TImsfoOwDqQAoiBGkq6h8et.l.eXF/oO5Zn.06',
};

export function getDeterministicSeedData() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nowIso = now.toISOString();

  // Past dates
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

  // Future dates
  const inFourDays = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const inFourDaysStr = inFourDays.toISOString().split('T')[0];
  const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const inTwoWeeksStr = inTwoWeeks.toISOString().split('T')[0];

  const users: User[] = [
    {
      _id: SEED_IDS.USER_MEERA,
      email: 'meera@carenest.local',
      name: 'Meera Sharma',
      role: 'senior',
      phone: '+91 98200 11223',
      passwordHash: SEED_IDS.PASSWORD_HASH,
      createdAt: '2026-01-15T08:00:00.000Z',
      updatedAt: '2026-01-15T08:00:00.000Z',
    },
    {
      _id: SEED_IDS.USER_SUNITA,
      email: 'sunita@carenest.local',
      name: 'Sunita Verma',
      role: 'caregiver',
      phone: '+91 98123 45678',
      passwordHash: SEED_IDS.PASSWORD_HASH,
      createdAt: '2026-01-16T09:00:00.000Z',
      updatedAt: '2026-01-16T09:00:00.000Z',
    },
    {
      _id: SEED_IDS.USER_RAHUL,
      email: 'rahul@carenest.local',
      name: 'Rahul Sharma',
      role: 'family',
      phone: '+91 98765 43210',
      passwordHash: SEED_IDS.PASSWORD_HASH,
      createdAt: '2026-01-15T08:30:00.000Z',
      updatedAt: '2026-01-15T08:30:00.000Z',
    },
  ];

  const careProfiles: CareProfile[] = [
    {
      _id: SEED_IDS.PROFILE_MEERA,
      fullName: 'Meera Sharma',
      preferredName: 'Meera ji',
      age: 72,
      gender: 'Female',
      bloodGroup: 'B+',
      emergencyContacts: [
        {
          name: 'Rahul Sharma',
          relationship: 'Son (Primary Family)',
          phone: '+91 98765 43210',
          isPrimary: true,
        },
        {
          name: 'Sunita Verma',
          relationship: 'Primary Caregiver',
          phone: '+91 98123 45678',
          isPrimary: false,
        },
        {
          name: 'Dr. Arvind Kulkarni',
          relationship: 'Cardiologist',
          phone: '+91 99887 76655',
          isPrimary: false,
        },
      ],
      allergies: ['Penicillin', 'Sulfa drugs'],
      chronicConditions: [
        'Hypertension (Stage 1)',
        'Type 2 Diabetes Mellitus',
        'Osteoarthritis (Bilateral Knees)',
      ],
      dietaryRestrictions: ['Low Sodium', 'Low Glycemic Index', 'Vegetarian'],
      notes: 'Meera ji prefers morning medications with lukewarm water after a light breakfast (daliya or poha). Remind her to rest for 15 minutes after taking Amlodipine.',
      inviteCode: SEED_IDS.INVITE_PASSCODE,
      inviteCodeHash: SEED_IDS.PASSCODE_HASH,
      createdAt: '2026-01-15T08:00:00.000Z',
      updatedAt: '2026-01-15T08:00:00.000Z',
    },
  ];

  const careMemberships: CareMembership[] = [
    {
      _id: SEED_IDS.MEMBERSHIP_MEERA,
      careProfileId: SEED_IDS.PROFILE_MEERA,
      userId: SEED_IDS.USER_MEERA,
      role: 'senior',
      status: 'active',
      userName: 'Meera Sharma',
      userEmail: 'meera@carenest.local',
      joinedAt: '2026-01-15T08:00:00.000Z',
      createdAt: '2026-01-15T08:00:00.000Z',
    },
    {
      _id: SEED_IDS.MEMBERSHIP_SUNITA,
      careProfileId: SEED_IDS.PROFILE_MEERA,
      userId: SEED_IDS.USER_SUNITA,
      role: 'primary_caregiver',
      status: 'active',
      userName: 'Sunita Verma',
      userEmail: 'sunita@carenest.local',
      invitedBy: SEED_IDS.USER_RAHUL,
      joinedAt: '2026-01-16T09:30:00.000Z',
      createdAt: '2026-01-16T09:30:00.000Z',
    },
    {
      _id: SEED_IDS.MEMBERSHIP_RAHUL,
      careProfileId: SEED_IDS.PROFILE_MEERA,
      userId: SEED_IDS.USER_RAHUL,
      role: 'family',
      status: 'active',
      userName: 'Rahul Sharma',
      userEmail: 'rahul@carenest.local',
      joinedAt: '2026-01-15T08:30:00.000Z',
      createdAt: '2026-01-15T08:30:00.000Z',
    },
  ];

  const medications: Medication[] = [
    {
      _id: SEED_IDS.MED_METFORMIN,
      careProfileId: SEED_IDS.PROFILE_MEERA,
      medicineName: 'Metformin Hydrochloride',
      medicineCategory: 'allopathic',
      dosage: '500 mg (1 tablet)',
      instructions: 'Take twice daily with water immediately after breakfast and dinner. Do not take on an empty stomach.',
      frequency: 'twice_daily',
      scheduledTimes: ['08:00', '20:00'],
      mealRelation: 'after_meal',
      pillColor: 'White',
      pillShape: 'Round',
      totalQuantity: 60,
      remainingQuantity: 28,
      refillThreshold: 10,
      startDate: '2026-01-01',
      status: 'active',
      reconciliationStatus: 'CONTINUE',
      reconciliationNotes: 'Verified by Dr. Priya Nair during telemedicine visit.',
      createdBy: SEED_IDS.USER_SUNITA,
      createdAt: '2026-01-15T09:00:00.000Z',
      updatedAt: '2026-01-15T09:00:00.000Z',
    },
    {
      _id: SEED_IDS.MED_AMLODIPINE,
      careProfileId: SEED_IDS.PROFILE_MEERA,
      medicineName: 'Amlodipine Besylate',
      medicineCategory: 'allopathic',
      dosage: '5 mg (1 tablet)',
      instructions: 'Take once daily in the morning after breakfast. Monitor BP if feeling lightheaded.',
      frequency: 'daily',
      scheduledTimes: ['09:00'],
      mealRelation: 'after_meal',
      pillColor: 'Yellow',
      pillShape: 'Round',
      totalQuantity: 30,
      remainingQuantity: 12,
      refillThreshold: 7,
      startDate: '2026-01-01',
      status: 'active',
      reconciliationStatus: 'CONTINUE',
      reconciliationNotes: 'Dosage maintained at 5mg daily.',
      createdBy: SEED_IDS.USER_SUNITA,
      createdAt: '2026-01-15T09:10:00.000Z',
      updatedAt: '2026-01-15T09:10:00.000Z',
    },
    {
      _id: SEED_IDS.MED_ASHWAGANDHA,
      careProfileId: SEED_IDS.PROFILE_MEERA,
      medicineName: 'Ashwagandha Churna',
      medicineCategory: 'ayurvedic',
      dosage: '1 tsp (approx 3g)',
      instructions: 'Stir well with warm milk at bedtime. Supports restful sleep and reduces joint discomfort.',
      frequency: 'daily',
      scheduledTimes: ['21:00'],
      mealRelation: 'with_meal',
      pillColor: 'Light Brown',
      pillShape: 'Powder',
      totalQuantity: 30,
      remainingQuantity: 4, // Intentionally low to trigger inventory refill alert!
      refillThreshold: 8,
      startDate: '2026-01-05',
      status: 'active',
      reconciliationStatus: 'CONTINUE',
      reconciliationNotes: 'Prescribed by Ayurvedic physician Dr. V. Joshi.',
      createdBy: SEED_IDS.USER_SUNITA,
      createdAt: '2026-01-15T09:20:00.000Z',
      updatedAt: '2026-01-15T09:20:00.000Z',
    },
    {
      _id: SEED_IDS.MED_CALCIUM,
      careProfileId: SEED_IDS.PROFILE_MEERA,
      medicineName: 'Shelcal 500 (Calcium + Vit D3)',
      medicineCategory: 'otc',
      dosage: '500 mg / 250 IU (1 tablet)',
      instructions: 'Take once daily after lunch with a full glass of water. For bone mineral support.',
      frequency: 'daily',
      scheduledTimes: ['13:00'],
      mealRelation: 'after_meal',
      pillColor: 'White',
      pillShape: 'Oval',
      totalQuantity: 30,
      remainingQuantity: 22,
      refillThreshold: 5,
      startDate: '2026-01-10',
      status: 'active',
      reconciliationStatus: 'CONTINUE',
      reconciliationNotes: 'Daily dietary calcium supplement.',
      createdBy: SEED_IDS.USER_SUNITA,
      createdAt: '2026-01-15T09:30:00.000Z',
      updatedAt: '2026-01-15T09:30:00.000Z',
    },
  ];

  // Pre-seed dose events for today and yesterday
  const doseEvents: DoseEvent[] = [
    // Yesterday doses (all taken)
    {
      _id: 'dose_event_yest_01',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      medicationId: SEED_IDS.MED_METFORMIN,
      doseKey: `${SEED_IDS.PROFILE_MEERA}_${SEED_IDS.MED_METFORMIN}_${yesterdayStr}_08:00`,
      scheduledAt: `${yesterdayStr}T08:00:00.000Z`,
      status: 'taken',
      administeredBy: SEED_IDS.USER_SUNITA,
      administeredByName: 'Sunita Verma',
      recordedAt: `${yesterdayStr}T08:15:22.000Z`,
      notes: 'Taken after breakfast of idlis.',
    },
    {
      _id: 'dose_event_yest_02',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      medicationId: SEED_IDS.MED_AMLODIPINE,
      doseKey: `${SEED_IDS.PROFILE_MEERA}_${SEED_IDS.MED_AMLODIPINE}_${yesterdayStr}_09:00`,
      scheduledAt: `${yesterdayStr}T09:00:00.000Z`,
      status: 'taken',
      administeredBy: SEED_IDS.USER_SUNITA,
      administeredByName: 'Sunita Verma',
      recordedAt: `${yesterdayStr}T09:10:45.000Z`,
      notes: 'Morning BP was 126/82.',
    },
    {
      _id: 'dose_event_yest_03',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      medicationId: SEED_IDS.MED_CALCIUM,
      doseKey: `${SEED_IDS.PROFILE_MEERA}_${SEED_IDS.MED_CALCIUM}_${yesterdayStr}_13:00`,
      scheduledAt: `${yesterdayStr}T13:00:00.000Z`,
      status: 'taken',
      administeredBy: SEED_IDS.USER_SUNITA,
      administeredByName: 'Sunita Verma',
      recordedAt: `${yesterdayStr}T13:20:10.000Z`,
      notes: 'Taken after lunch.',
    },
    {
      _id: 'dose_event_yest_04',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      medicationId: SEED_IDS.MED_METFORMIN,
      doseKey: `${SEED_IDS.PROFILE_MEERA}_${SEED_IDS.MED_METFORMIN}_${yesterdayStr}_20:00`,
      scheduledAt: `${yesterdayStr}T20:00:00.000Z`,
      status: 'taken',
      administeredBy: SEED_IDS.USER_SUNITA,
      administeredByName: 'Sunita Verma',
      recordedAt: `${yesterdayStr}T20:12:00.000Z`,
      notes: 'Taken after dinner.',
    },
    {
      _id: 'dose_event_yest_05',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      medicationId: SEED_IDS.MED_ASHWAGANDHA,
      doseKey: `${SEED_IDS.PROFILE_MEERA}_${SEED_IDS.MED_ASHWAGANDHA}_${yesterdayStr}_21:00`,
      scheduledAt: `${yesterdayStr}T21:00:00.000Z`,
      status: 'taken',
      administeredBy: SEED_IDS.USER_SUNITA,
      administeredByName: 'Sunita Verma',
      recordedAt: `${yesterdayStr}T21:15:00.000Z`,
      notes: 'With warm turmeric milk.',
    },

    // Today doses: Morning Metformin & Amlodipine already administered, afternoon & evening scheduled
    {
      _id: 'dose_event_today_01',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      medicationId: SEED_IDS.MED_METFORMIN,
      doseKey: `${SEED_IDS.PROFILE_MEERA}_${SEED_IDS.MED_METFORMIN}_${todayStr}_08:00`,
      scheduledAt: `${todayStr}T08:00:00.000Z`,
      status: 'taken',
      administeredBy: SEED_IDS.USER_SUNITA,
      administeredByName: 'Sunita Verma',
      recordedAt: `${todayStr}T08:14:30.000Z`,
      notes: 'Taken with warm water after vegetable daliya.',
    },
    {
      _id: 'dose_event_today_02',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      medicationId: SEED_IDS.MED_AMLODIPINE,
      doseKey: `${SEED_IDS.PROFILE_MEERA}_${SEED_IDS.MED_AMLODIPINE}_${todayStr}_09:00`,
      scheduledAt: `${todayStr}T09:00:00.000Z`,
      status: 'taken',
      administeredBy: SEED_IDS.USER_SUNITA,
      administeredByName: 'Sunita Verma',
      recordedAt: `${todayStr}T09:05:10.000Z`,
      notes: 'BP checked: 124/80 mmHg.',
    },
  ];

  const appointments: Appointment[] = [
    {
      _id: 'appt_lilavati_01',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      doctorName: 'Dr. Arvind Kulkarni',
      specialty: 'Cardiologist',
      dateTime: `${inFourDaysStr}T10:30:00.000Z`,
      location: 'Lilavati Hospital & Research Centre, Room 402, Bandra West, Mumbai',
      notes: 'Routine 3-month cardiovascular follow-up. Carry recent ECG and blood pressure log.',
      status: 'scheduled',
      createdBy: SEED_IDS.USER_RAHUL,
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: '2026-02-01T10:00:00.000Z',
    },
    {
      _id: 'appt_endocrine_02',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      doctorName: 'Dr. Priya Nair',
      specialty: 'Endocrinologist',
      dateTime: `${inTwoWeeksStr}T16:00:00.000Z`,
      location: 'Apollo Medical Clinic, Chembur, Mumbai',
      notes: 'HbA1c review and diabetes medication adjustment check.',
      status: 'scheduled',
      createdBy: SEED_IDS.USER_SUNITA,
      createdAt: '2026-02-05T11:00:00.000Z',
      updatedAt: '2026-02-05T11:00:00.000Z',
    },
  ];

  const healthLogs: HealthLog[] = [
    {
      _id: 'health_log_01',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      symptom: 'dizziness',
      severity: 'mild',
      notes: 'Felt slight lightheadedness when standing up quickly after morning meditation. Settled within 5 minutes after drinking lemon water.',
      reportedBy: SEED_IDS.USER_SUNITA,
      reportedByName: 'Sunita Verma (Caregiver)',
      reportedAt: `${yesterdayStr}T10:45:00.000Z`,
    },
    {
      _id: 'health_log_02',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      symptom: 'weakness',
      severity: 'mild',
      notes: 'Mild fatigue reported after veranda walk. Normal blood sugar tested: 118 mg/dL.',
      reportedBy: SEED_IDS.USER_MEERA,
      reportedByName: 'Meera Sharma (Senior)',
      reportedAt: `${twoDaysAgoStr}T17:15:00.000Z`,
    },
  ];

  const caregiverNotes: CaregiverNote[] = [
    {
      _id: 'note_01',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      authorId: SEED_IDS.USER_SUNITA,
      authorName: 'Sunita Verma',
      authorRole: 'primary_caregiver',
      shiftDate: yesterdayStr,
      noteContent: 'Meera ji was in cheerful spirits today. Completed 15 minutes of guided veranda walking. Morning fasting sugar was 114 mg/dL and BP was 126/82 mmHg. She had vegetable khichdi for dinner and enjoyed reading the newspaper in the evening. Ashwagandha churna container is nearly empty (only 4 doses left); please arrange a refill before weekend.',
      createdAt: `${yesterdayStr}T21:30:00.000Z`,
    },
    {
      _id: 'note_02',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      authorId: SEED_IDS.USER_SUNITA,
      authorName: 'Sunita Verma',
      authorRole: 'primary_caregiver',
      shiftDate: twoDaysAgoStr,
      noteContent: 'Shift uneventful. All afternoon and evening medications taken smoothly with meals. Hydration was good (approx 2 liters of water and herbal tea). No knee swelling observed today.',
      createdAt: `${twoDaysAgoStr}T21:00:00.000Z`,
    },
  ];

  const notifications: NotificationRecord[] = [
    {
      _id: 'notif_refill_ashwagandha',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      recipientId: SEED_IDS.USER_RAHUL,
      title: 'Medication Refill Alert: Ashwagandha Churna',
      message: 'Ashwagandha Churna has only 4 doses remaining (Refill threshold: 8). Please order a refill soon.',
      type: 'refill',
      priority: 'high',
      status: 'unread',
      sentViaEmail: false,
      createdAt: `${yesterdayStr}T21:31:00.000Z`,
    },
    {
      _id: 'notif_symptom_dizziness',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      title: 'Symptom Logged: Mild Dizziness',
      message: 'Sunita Verma logged a mild dizziness episode for Meera Sharma yesterday at 10:45 AM. Symptoms resolved after hydration.',
      type: 'symptom_alert',
      priority: 'medium',
      status: 'read',
      sentViaEmail: false,
      createdAt: `${yesterdayStr}T10:46:00.000Z`,
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      _id: 'audit_01',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      actorId: SEED_IDS.USER_SUNITA,
      actorName: 'Sunita Verma',
      actorRole: 'primary_caregiver',
      action: 'ADMINISTER_DOSE',
      entityType: 'doseEvent',
      entityId: `dose_event_today_01`,
      details: {
        medicineName: 'Metformin Hydrochloride',
        doseKey: `${SEED_IDS.PROFILE_MEERA}_${SEED_IDS.MED_METFORMIN}_${todayStr}_08:00`,
        status: 'taken',
      },
      createdAt: `${todayStr}T08:14:30.000Z`,
    },
    {
      _id: 'audit_02',
      careProfileId: SEED_IDS.PROFILE_MEERA,
      actorId: SEED_IDS.USER_SUNITA,
      actorName: 'Sunita Verma',
      actorRole: 'primary_caregiver',
      action: 'ADMINISTER_DOSE',
      entityType: 'doseEvent',
      entityId: `dose_event_today_02`,
      details: {
        medicineName: 'Amlodipine Besylate',
        doseKey: `${SEED_IDS.PROFILE_MEERA}_${SEED_IDS.MED_AMLODIPINE}_${todayStr}_09:00`,
        status: 'taken',
      },
      createdAt: `${todayStr}T09:05:10.000Z`,
    },
  ];

  return {
    users,
    careProfiles,
    careMemberships,
    medications,
    doseEvents,
    appointments,
    healthLogs,
    caregiverNotes,
    notifications,
    auditLogs,
  };
}
