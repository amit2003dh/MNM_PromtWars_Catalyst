import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDoctorSummary } from '@/lib/ai/doctor-summary';
import { generateFallbackDoctorSummary } from '@/lib/ai/fallback';
import { POST as doctorSummaryPOST, GET as doctorSummaryGET } from '@/app/api/ai/doctor-summary/route';
import { POST as explainPOST } from '@/app/api/ai/explain/route';

test('Gemini Doctor Summary & Deterministic Fallback Suite', async (t) => {
  const mockPatient = {
    _id: 'profile_meera_sharma_01',
    fullName: 'Meera Sharma',
    preferredName: 'Meera-ji',
    age: 72,
    gender: 'Female',
    bloodGroup: 'B+',
    emergencyContacts: [
      { name: 'Rahul Sharma', relationship: 'Son', phone: '+91 98765 43210', isPrimary: true },
      { name: 'Dr. Alok Verma', relationship: 'Primary Physician', phone: '+91 98111 22334' },
    ],
    allergies: ['Penicillin', 'Sulfa drugs'],
    chronicConditions: ['Type 2 Diabetes', 'Hypertension', 'Mild Osteoarthritis'],
    dietaryRestrictions: ['Vegetarian', 'Low Sodium', 'Diabetic Diet'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockMedications = [
    {
      _id: 'med_metformin_01',
      careProfileId: 'profile_meera_sharma_01',
      medicineName: 'Metformin Hydrochloride',
      medicineCategory: 'allopathic',
      dosage: '500mg',
      instructions: 'Take 1 tablet twice daily with or immediately after meals',
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
      createdBy: 'user_sunita_02',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'med_amlodipine_02',
      careProfileId: 'profile_meera_sharma_01',
      medicineName: 'Amlodipine Besylate',
      medicineCategory: 'allopathic',
      dosage: '5mg',
      instructions: 'Take 1 tablet every morning with plain water',
      frequency: 'daily',
      scheduledTimes: ['09:00'],
      mealRelation: 'before_meal',
      pillColor: 'Yellow',
      pillShape: 'Round',
      totalQuantity: 30,
      remainingQuantity: 4, // Triggers refill threshold!
      refillThreshold: 7,
      startDate: '2026-01-01',
      status: 'active',
      reconciliationStatus: 'CONTINUE',
      createdBy: 'user_sunita_02',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'med_ashwagandha_03',
      careProfileId: 'profile_meera_sharma_01',
      medicineName: 'Ashwagandha Churna',
      medicineCategory: 'ayurvedic',
      dosage: '1 teaspoon (3g)',
      instructions: 'Mix with warm milk at bedtime',
      frequency: 'daily',
      scheduledTimes: ['21:00'],
      mealRelation: 'after_meal',
      pillColor: 'Brown',
      pillShape: 'Capsule',
      totalQuantity: 100,
      remainingQuantity: 65,
      refillThreshold: 15,
      startDate: '2026-01-15',
      status: 'active',
      reconciliationStatus: 'CONTINUE',
      createdBy: 'user_sunita_02',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockDoses = [
    { _id: 'd1', careProfileId: 'profile_meera_sharma_01', medicationId: 'med_metformin_01', doseKey: 'k1', scheduledAt: new Date().toISOString(), status: 'taken' },
    { _id: 'd2', careProfileId: 'profile_meera_sharma_01', medicationId: 'med_amlodipine_02', doseKey: 'k2', scheduledAt: new Date().toISOString(), status: 'taken' },
    { _id: 'd3', careProfileId: 'profile_meera_sharma_01', medicationId: 'med_ashwagandha_03', doseKey: 'k3', scheduledAt: new Date().toISOString(), status: 'taken' },
    { _id: 'd4', careProfileId: 'profile_meera_sharma_01', medicationId: 'med_metformin_01', doseKey: 'k4', scheduledAt: new Date().toISOString(), status: 'missed' },
  ];

  const mockLogs = [
    { _id: 'l1', careProfileId: 'profile_meera_sharma_01', symptom: 'dizziness', severity: 'mild', notes: 'Felt slight dizziness in the morning', reportedBy: 'user_meera_01', reportedByName: 'Meera Sharma', reportedAt: new Date().toISOString() },
  ];

  const mockNotes = [
    { _id: 'n1', careProfileId: 'profile_meera_sharma_01', authorId: 'user_sunita_02', authorName: 'Sunita Verma', authorRole: 'caregiver', shiftDate: '2026-11-15', noteContent: 'Meera-ji completed her morning walk and breakfast comfortably.', createdAt: new Date().toISOString() },
  ];

  await t.test('1. Generates complete deterministic fallback summary without throwing', async () => {
    const summary = generateFallbackDoctorSummary({
      careProfile: mockPatient,
      medications: mockMedications,
      doseEvents: mockDoses,
      healthLogs: mockLogs,
      caregiverNotes: mockNotes,
      timeframeDays: 7,
    });

    assert.ok(summary, 'Summary must be returned');
    assert.equal(summary.patientInfo.fullName, 'Meera Sharma');
    assert.equal(summary.patientInfo.age, 72);
    assert.deepEqual(summary.patientInfo.allergies, ['Penicillin', 'Sulfa drugs']);
    assert.equal(summary.activeMedications.length, 3);
    
    // Check refill warning flag on Amlodipine (remaining 4 <= threshold 7)
    const amlodipine = summary.activeMedications.find(m => m.name.includes('Amlodipine'));
    assert.ok(amlodipine, 'Amlodipine must be listed');
    assert.equal(amlodipine.refillWarning, true, 'Refill warning must be active for remainingQuantity <= threshold');

    // Check adherence stats (3 taken out of 4 = 75%)
    assert.equal(summary.adherenceStats.totalScheduled, 4);
    assert.equal(summary.adherenceStats.totalTaken, 3);
    assert.equal(summary.adherenceStats.totalMissed, 1);
    assert.equal(summary.adherenceStats.adherencePercentage, 75);

    // Check symptom trends
    assert.equal(summary.symptomTrends.totalLogged, 1);
    assert.equal(summary.symptomTrends.symptomCounts['dizziness'], 1);

    // Check physician questions generated
    assert.ok(Array.isArray(summary.questionsForDoctor), 'Questions array must be present');
    assert.ok(summary.questionsForDoctor.length >= 3, 'At least 3 questions for doctor must be generated');

    // Check printable markdown
    assert.ok(summary.summaryMarkdown.includes('CareNest AI — Clinical Health & Medication Summary'), 'Must include markdown title');
    assert.ok(summary.summaryMarkdown.includes('Type 2 Diabetes'), 'Must include chronic conditions');
    assert.ok(summary.summaryMarkdown.includes('Suggested Discussion Points for Attending Physician'), 'Must include physician discussion section');
  });

  await t.test('2. generateDoctorSummary handles missing GEMINI_API_KEY gracefully with fallback', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const summary = await generateDoctorSummary({
        careProfile: mockPatient,
        medications: mockMedications,
        doseEvents: mockDoses,
        healthLogs: mockLogs,
        caregiverNotes: mockNotes,
        timeframeDays: 7,
      });

      assert.ok(summary, 'Must return summary even when GEMINI_API_KEY is not set');
      assert.equal(summary.isAiGenerated, false, 'isAiGenerated must be false in fallback mode');
      assert.ok(summary.summaryMarkdown.length > 200, 'Printable markdown report must be populated');
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('3. POST /api/ai/doctor-summary endpoint returns 200 with structured data', async () => {
    const req = new Request('http://localhost:3000/api/ai/doctor-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        careProfile: mockPatient,
        medications: mockMedications,
        doseEvents: mockDoses,
        healthLogs: mockLogs,
        caregiverNotes: mockNotes,
        timeframeDays: 7,
      }),
    });

    const res = await doctorSummaryPOST(req);
    assert.equal(res.status, 200, 'Endpoint should return 200 OK');

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.summaryMarkdown.includes('Meera Sharma'));
    assert.equal(json.data.adherenceStats.adherencePercentage, 75);
  });

  await t.test('4. GET /api/ai/doctor-summary returns 200 loading seeded profile', async () => {
    const req = new Request('http://localhost:3000/api/ai/doctor-summary?timeframeDays=7');
    const res = await doctorSummaryGET(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.patientInfo.fullName);
    assert.ok(Array.isArray(json.data.activeMedications));
  });

  await t.test('5. POST /api/ai/explain endpoint translates medical instructions to simple language', async () => {
    const req = new Request('http://localhost:3000/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicineName: 'Amlodipine Besylate',
        dosage: '5mg',
        instructions: 'Take 1 tablet every morning with plain water',
        mealRelation: 'before_meal',
        category: 'allopathic',
        pillColor: 'Yellow',
        pillShape: 'Round tablet',
      }),
    });

    const res = await explainPOST(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.simpleInstructions, 'Must provide simple instructions');
    assert.ok(json.data.speechText, 'Must provide voice-ready read aloud text');
    assert.ok(json.data.foodInstructions, 'Must provide food instructions');
  });
});
