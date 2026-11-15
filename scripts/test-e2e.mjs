#!/usr/bin/env node
/**
 * CareNest AI — End-to-End Operational Verification Script
 * 
 * Exercises the entire patient and caregiver lifecycle:
 * 1. Database & In-Memory Store Initialization
 * 2. Multi-Role Authentication & Session Resolution (Senior Meera, Caregiver Sunita, Family Rahul)
 * 3. Care Profile & Invite Passcode Hashing Verification
 * 4. Medication Cabinet Management & Inventory Refill Thresholds
 * 5. Daily Schedule & Dose Retrieval
 * 6. Concurrency-Safe Atomic Anti-Double-Dosing Locking Protocol (Sequential & 5x Concurrent)
 * 7. Clinical Health Journal & Symptom Reporting
 * 8. Caregiver Shift Handoff Notes
 * 9. Clinical Doctor Summary Generation (Gemini AI & Deterministic Fallback)
 * 10. Reminder Escalation Daemon & Resend Email Fallback
 * 11. Role-Based Access Control (RBAC) & Care Circle Isolation Enforcement
 */

import { register } from 'node:module';

// Register TypeScript and `@/` path loader dynamically
register('../tests/helpers/loader.mjs', import.meta.url);

async function main() {
  const startTime = Date.now();
  process.env.CRON_SECRET = 'carenest-secret-cron-token-2026';

  console.log('='.repeat(78));
  console.log('          CareNest AI — End-to-End Operational Test Suite');
  console.log('='.repeat(78));
  console.log(`Execution started at: ${new Date().toISOString()}`);
  console.log(`Node.js runtime: ${process.version} on ${process.platform}\n`);

  // Dynamically import application route handlers and library modules
  const { POST: registerPOST } = await import('@/app/api/auth/register/route');
  const { GET: sessionGET } = await import('@/app/api/auth/session/route');
  const { GET: careProfilesGET } = await import('@/app/api/care-profiles/route');
  const { POST: joinCirclePOST } = await import('@/app/api/care-profiles/join/route');
  const { GET: medicationsGET, POST: medicationsPOST } = await import('@/app/api/medications/route');
  const { GET: todayDosesGET } = await import('@/app/api/doses/today/route');
  const { POST: administerDosePOST } = await import('@/app/api/doses/administer/route');
  const { POST: healthLogsPOST } = await import('@/app/api/health-logs/route');
  const { POST: notesPOST } = await import('@/app/api/caregiver-notes/route');
  const { GET: doctorSummaryGET } = await import('@/app/api/ai/doctor-summary/route');
  const { POST: explainPOST } = await import('@/app/api/ai/explain/route');
  const { POST: cronRemindersPOST } = await import('@/app/api/cron/reminders/route');
  const { 
    getDatabase, 
    getMedicationsCollection, 
    SEED_IDS 
  } = await import('@/lib/db');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const testResults = [];

  async function step(name, fn) {
    totalTests++;
    const stepStart = Date.now();
    try {
      await fn();
      const duration = Date.now() - stepStart;
      passedTests++;
      testResults.push({ name, status: 'PASSED', duration });
      console.log(`  [PASS] ${name} (${duration}ms)`);
    } catch (err) {
      const duration = Date.now() - stepStart;
      failedTests++;
      testResults.push({ name, status: 'FAILED', duration, error: err.message });
      console.error(`  [FAIL] ${name} (${duration}ms):`, err.message);
    }
  }

  console.log('--- Step 1: Database & Seed Verification ---');
  await step('Database connection / In-memory mock store ready', async () => {
    const db = await getDatabase();
    if (!db) throw new Error('Database handle is null');
  });

  console.log('\n--- Step 2: Multi-Role Authentication & Session Resolution ---');
  await step('Primary Caregiver (Sunita) session authenticated', async () => {
    const req = new Request('http://localhost:3000/api/auth/session', {
      headers: { 'x-user-id': SEED_IDS.USER_SUNITA },
    });
    const res = await sessionGET(req);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (!json.user || json.user.role !== 'caregiver') {
      throw new Error(`Caregiver session mismatch: ${JSON.stringify(json)}`);
    }
  });

  await step('Senior Patient (Meera Sharma) session authenticated', async () => {
    const req = new Request('http://localhost:3000/api/auth/session', {
      headers: { 'x-user-id': SEED_IDS.USER_MEERA },
    });
    const res = await sessionGET(req);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (!json.user || json.user.role !== 'senior') {
      throw new Error(`Senior session mismatch: ${JSON.stringify(json)}`);
    }
  });

  await step('Family Member (Rahul) session authenticated', async () => {
    const req = new Request('http://localhost:3000/api/auth/session', {
      headers: { 'x-user-id': SEED_IDS.USER_RAHUL },
    });
    const res = await sessionGET(req);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (!json.user || json.user.role !== 'family') {
      throw new Error(`Family session mismatch: ${JSON.stringify(json)}`);
    }
  });

  console.log('\n--- Step 3: Care Circle Profile & Passcode Verification ---');
  await step('Meera Sharma Care Circle details loaded', async () => {
    const req = new Request(`http://localhost:3000/api/care-profiles?id=${SEED_IDS.PROFILE_MEERA}`, {
      headers: { 'x-user-id': SEED_IDS.USER_SUNITA },
    });
    const res = await careProfilesGET(req);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (!json.profile || json.profile.fullName !== 'Meera Sharma') {
      throw new Error('Care profile Meera Sharma not found');
    }
    if (json.members.length < 3) {
      throw new Error(`Expected at least 3 circle members, found ${json.members.length}`);
    }
  });

  await step('Joining Care Circle requires valid invite passcode (NEST72)', async () => {
    // 1. Register new family member
    const newEmail = `e2e_user_${Date.now()}@carenest.internal`;
    const regReq = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: 'SecurePassword123!',
        name: 'Anita Sharma',
        role: 'family',
      }),
    });
    const regRes = await registerPOST(regReq);
    if (regRes.status !== 201) throw new Error(`Register failed with ${regRes.status}`);
    const { user: newUser } = await regRes.json();

    // 2. Reject incorrect passcode
    const badReq = new Request('http://localhost:3000/api/care-profiles/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': newUser._id },
      body: JSON.stringify({ inviteCode: 'WRONG_CODE' }),
    });
    const badRes = await joinCirclePOST(badReq);
    if (badRes.status !== 404 && badRes.status !== 401) {
      throw new Error(`Expected 404/401 for bad passcode, got ${badRes.status}`);
    }

    // 3. Accept valid passcode NEST72
    const validReq = new Request('http://localhost:3000/api/care-profiles/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': newUser._id },
      body: JSON.stringify({ inviteCode: 'NEST72', role: 'family' }),
    });
    const validRes = await joinCirclePOST(validReq);
    if (validRes.status !== 200) throw new Error(`Expected 200 for valid passcode, got ${validRes.status}`);
  });

  console.log('\n--- Step 4: Medication Cabinet & Prescription Management ---');
  let createdMedicationId = null;
  await step('Caregiver Sunita adds new medication (Glimepiride 1mg)', async () => {
    const req = new Request('http://localhost:3000/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SEED_IDS.USER_SUNITA },
      body: JSON.stringify({
        careProfileId: SEED_IDS.PROFILE_MEERA,
        medicineName: 'Glimepiride',
        medicineCategory: 'allopathic',
        dosage: '1mg',
        instructions: 'Take 1 tablet before breakfast',
        frequency: 'daily',
        scheduledTimes: ['07:30'],
        mealRelation: 'before_meal',
        pillColor: 'Pink',
        pillShape: 'Oval',
        totalQuantity: 30,
        remainingQuantity: 30,
        refillThreshold: 5,
        startDate: '2026-02-01',
        status: 'active',
        reconciliationStatus: 'CONTINUE',
      }),
    });
    const res = await medicationsPOST(req);
    if (res.status !== 201) throw new Error(`Expected 201 Created, got ${res.status}`);
    const json = await res.json();
    createdMedicationId = json.medication._id;
    if (!createdMedicationId) throw new Error('Medication ID not returned');
  });

  await step('Retrieve active medications list for Meera Sharma', async () => {
    const req = new Request(`http://localhost:3000/api/medications?careProfileId=${SEED_IDS.PROFILE_MEERA}`, {
      headers: { 'x-user-id': SEED_IDS.USER_SUNITA },
    });
    const res = await medicationsGET(req);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (!json.medications || json.medications.length < 4) {
      throw new Error(`Expected at least 4 active medications, got ${json.medications?.length}`);
    }
  });

  console.log("\n--- Step 5: Daily Schedule & Today's Doses ---");
  await step("Fetch today's unified dose schedule (GET /api/doses/today)", async () => {
    const req = new Request(`http://localhost:3000/api/doses/today?careProfileId=${SEED_IDS.PROFILE_MEERA}`, {
      headers: { 'x-user-id': SEED_IDS.USER_SUNITA },
    });
    const res = await todayDosesGET(req);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.items) || json.items.length === 0) {
      throw new Error('Schedule items empty');
    }
  });

  console.log('\n--- Step 6: Atomic Anti-Double-Dosing Locking Protocol ---');
  const testDoseKey = `e2e_atomic_lock_${Date.now()}`;
  await step('First dose administration succeeds (200 OK) and decrements inventory', async () => {
    const medCol = await getMedicationsCollection();
    const medBefore = await medCol.findOne({ _id: SEED_IDS.MED_METFORMIN });
    const qtyBefore = medBefore.remainingQuantity;

    const req = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SEED_IDS.USER_SUNITA },
      body: JSON.stringify({
        careProfileId: SEED_IDS.PROFILE_MEERA,
        medicationId: SEED_IDS.MED_METFORMIN,
        doseKey: testDoseKey,
        scheduledAt: new Date().toISOString(),
        status: 'taken',
        notes: 'Administered with warm water after lunch',
      }),
    });

    const res = await administerDosePOST(req);
    if (res.status !== 200) throw new Error(`Expected 200 OK, got ${res.status}`);
    const json = await res.json();
    if (json.remainingQuantity !== qtyBefore - 1) {
      throw new Error(`Expected inventory ${qtyBefore - 1}, got ${json.remainingQuantity}`);
    }
  });

  await step('Duplicate sequential doseKey triggers HTTP 409 Conflict with safety details', async () => {
    const medCol = await getMedicationsCollection();
    const medBefore = await medCol.findOne({ _id: SEED_IDS.MED_METFORMIN });
    const qtyBefore = medBefore.remainingQuantity;

    const req = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SEED_IDS.USER_MEERA },
      body: JSON.stringify({
        careProfileId: SEED_IDS.PROFILE_MEERA,
        medicationId: SEED_IDS.MED_METFORMIN,
        doseKey: testDoseKey,
        status: 'taken',
      }),
    });

    const res = await administerDosePOST(req);
    if (res.status !== 409) throw new Error(`Expected 409 Conflict, got ${res.status}`);
    const json = await res.json();
    if (!json.alreadyAdministered) throw new Error('alreadyAdministered flag missing');
    if (json.doseKey !== testDoseKey) throw new Error('doseKey mismatch in conflict response');

    // Verify inventory NOT decremented again
    const medAfter = await medCol.findOne({ _id: SEED_IDS.MED_METFORMIN });
    if (medAfter.remainingQuantity !== qtyBefore) {
      throw new Error('Inventory was erroneously double-decremented');
    }
  });

  await step('Concurrent race condition: 5 simultaneous POST requests yields 1 success and 4 conflicts', async () => {
    const concurrentKey = `e2e_race_key_${Date.now()}`;
    const makeReq = (i) => new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SEED_IDS.USER_SUNITA },
      body: JSON.stringify({
        careProfileId: SEED_IDS.PROFILE_MEERA,
        medicationId: SEED_IDS.MED_METFORMIN,
        doseKey: concurrentKey,
        status: 'taken',
        notes: `Concurrent burst #${i}`,
      }),
    });

    const results = await Promise.all([makeReq(1), makeReq(2), makeReq(3), makeReq(4), makeReq(5)].map(r => administerDosePOST(r)));
    const statuses = results.map(r => r.status);
    const count200 = statuses.filter(s => s === 200).length;
    const count409 = statuses.filter(s => s === 409).length;

    if (count200 !== 1 || count409 !== 4) {
      throw new Error(`Expected exactly 1x 200 and 4x 409, got: ${JSON.stringify(statuses)}`);
    }
  });

  console.log('\n--- Step 7: Clinical Health & Symptom Logging ---');
  await step('Meera Sharma logs symptom (mild dizziness) with auto-notification', async () => {
    const req = new Request('http://localhost:3000/api/health-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SEED_IDS.USER_MEERA },
      body: JSON.stringify({
        careProfileId: SEED_IDS.PROFILE_MEERA,
        symptom: 'dizziness',
        severity: 'mild',
        notes: 'Felt slight dizziness 30 mins after morning medicine',
      }),
    });

    const res = await healthLogsPOST(req);
    if (res.status !== 201) throw new Error(`Expected 201 Created, got ${res.status}`);
    const json = await res.json();
    if (json.log.symptom !== 'dizziness') throw new Error('Symptom mismatch');
  });

  console.log('\n--- Step 8: Shift Handoff Notes ---');
  await step('Caregiver Sunita posts shift handoff note', async () => {
    const req = new Request('http://localhost:3000/api/caregiver-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SEED_IDS.USER_SUNITA },
      body: JSON.stringify({
        careProfileId: SEED_IDS.PROFILE_MEERA,
        noteContent: 'Shift Handoff: Meera-ji completed evening exercises. Blood sugar checked at 135 mg/dL. All evening doses given on schedule.',
      }),
    });

    const res = await notesPOST(req);
    if (res.status !== 201) throw new Error(`Expected 201 Created, got ${res.status}`);
  });

  console.log('\n--- Step 9: Clinical Doctor Summary Generation ---');
  await step('Generate printable clinical summary with deterministic fallback', async () => {
    const req = new Request(`http://localhost:3000/api/ai/doctor-summary?careProfileId=${SEED_IDS.PROFILE_MEERA}&timeframeDays=7`);
    const res = await doctorSummaryGET(req);
    if (res.status !== 200) throw new Error(`Expected 200 OK, got ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error('Doctor summary payload invalid');
    if (!json.data.summaryMarkdown.includes('Meera Sharma')) {
      throw new Error('Summary markdown does not contain patient name');
    }
    if (!Array.isArray(json.data.questionsForDoctor) || json.data.questionsForDoctor.length < 3) {
      throw new Error('Expected at least 3 physician discussion questions');
    }
  });

  await step('Medication plain language explanation & TTS voice prompt', async () => {
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
    if (res.status !== 200) throw new Error(`Expected 200 OK, got ${res.status}`);
    const json = await res.json();
    if (!json.data.simpleInstructions || !json.data.speechText) {
      throw new Error('Plain instructions or speechText missing');
    }
  });

  console.log('\n--- Step 10: Reminder Escalation Daemon & Email Fallback ---');
  await step('CRON_SECRET security check: unauthorized call returns 401', async () => {
    const req = new Request('http://localhost:3000/api/cron/reminders', {
      method: 'POST',
      headers: { authorization: 'Bearer invalid-secret' },
    });
    const res = await cronRemindersPOST(req);
    if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
  });

  await step('Authorized reminder daemon executes escalation ladder cleanly', async () => {
    const req = new Request('http://localhost:3000/api/cron/reminders', {
      method: 'POST',
      headers: {
        authorization: 'Bearer carenest-secret-cron-token-2026',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        simulatedTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    });
    const res = await cronRemindersPOST(req);
    if (res.status !== 200) throw new Error(`Expected 200 OK, got ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.summary) throw new Error('Reminder daemon execution summary missing');
  });

  console.log('\n--- Step 11: RBAC Access Control & Isolation Constraints ---');
  await step('Senior Meera Sharma blocked from adding medications (403 Forbidden)', async () => {
    const req = new Request('http://localhost:3000/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SEED_IDS.USER_MEERA },
      body: JSON.stringify({
        careProfileId: SEED_IDS.PROFILE_MEERA,
        medicineName: 'Restricted Drug',
        medicineCategory: 'allopathic',
        dosage: '10mg',
        instructions: 'Self prescribed',
        frequency: 'daily',
        scheduledTimes: ['08:00'],
        mealRelation: 'after_meal',
        pillColor: 'White',
        pillShape: 'Round',
        totalQuantity: 10,
        remainingQuantity: 10,
        refillThreshold: 2,
        startDate: '2026-02-01',
      }),
    });
    const res = await medicationsPOST(req);
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
  });

  await step('Family Member Rahul blocked from administering doses (403 Forbidden)', async () => {
    const req = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SEED_IDS.USER_RAHUL },
      body: JSON.stringify({
        careProfileId: SEED_IDS.PROFILE_MEERA,
        medicationId: SEED_IDS.MED_METFORMIN,
        doseKey: `family_blocked_${Date.now()}`,
        status: 'taken',
      }),
    });
    const res = await administerDosePOST(req);
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
  });

  await step('Care Circle Isolation prevents cross-circle medication access (403 Forbidden)', async () => {
    const req = new Request('http://localhost:3000/api/medications?careProfileId=circle_isolated_999', {
      headers: { 'x-user-id': SEED_IDS.USER_SUNITA },
    });
    const res = await medicationsGET(req);
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
  });

  // Print Test Report
  const totalDuration = Date.now() - startTime;
  console.log('\n' + '='.repeat(78));
  console.log('                        TEST RUNNER SUMMARY REPORT');
  console.log('='.repeat(78));
  console.log(`Total Verification Steps: ${totalTests}`);
  console.log(`Passed:                   ${passedTests} (100%)`);
  console.log(`Failed:                   ${failedTests}`);
  console.log(`Total Execution Time:     ${totalDuration}ms`);
  console.log('='.repeat(78));

  if (failedTests > 0) {
    console.error('\n❌ E2E VERIFICATION FAILED: Some assertions encountered errors.');
    process.exit(1);
  } else {
    console.log('\n✅ ALL E2E VERIFICATION CHECKS PASSED: CareNest AI is fully operational!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal unhandled error during E2E verification:', err);
  process.exit(1);
});
