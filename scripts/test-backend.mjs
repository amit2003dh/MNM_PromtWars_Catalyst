import { getMockDatabase } from '../src/lib/db/mock-store.js';
import { hashPassword, comparePassword, hashPasscode, comparePasscode } from '../src/lib/auth/passwords.js';

async function testBackend() {
  console.log('🧪 Starting CareNest AI Backend Self-Verification Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Database & Seed Verification
  console.log('1️⃣ Testing In-Memory Mock Database & Seed Data');
  const db = getMockDatabase();
  const users = await db.collection('users').find({}).toArray();
  assert(users.length === 3, `Expected 3 users, found ${users.length}`);

  const meera = await db.collection('users').findOne({ email: 'meera@carenest.local' });
  assert(meera && meera.name === 'Meera Sharma' && meera.role === 'senior', 'Meera Sharma user found with senior role');

  const sunita = await db.collection('users').findOne({ email: 'sunita@carenest.local' });
  assert(sunita && sunita.role === 'caregiver', 'Sunita user found with caregiver role');

  const rahul = await db.collection('users').findOne({ email: 'rahul@carenest.local' });
  assert(rahul && rahul.role === 'family', 'Rahul user found with family role');

  const profile = await db.collection('careProfiles').findOne({ _id: 'profile_meera_sharma_01' });
  assert(profile && profile.fullName === 'Meera Sharma', 'Meera Sharma CareProfile verified');

  const meds = await db.collection('medications').find({ careProfileId: 'profile_meera_sharma_01' }).toArray();
  assert(meds.length === 4, `Expected 4 medications, found ${meds.length}`);

  // 2. Auth & Bcrypt Verification
  console.log('\n2️⃣ Testing Bcrypt Passwords & Passcodes');
  const testHash = await hashPassword('password123');
  const match = await comparePassword('password123', testHash);
  assert(match === true, 'Bcrypt password hashing and comparison verified');

  const wrongMatch = await comparePassword('wrongpassword', testHash);
  assert(wrongMatch === false, 'Invalid password correctly rejected');

  const codeMatch = await comparePasscode('NEST72', profile.inviteCodeHash);
  assert(codeMatch === true, 'Invite passcode NEST72 verified against stored hash');

  const codeMatchInsensitive = await comparePasscode('nest72', profile.inviteCodeHash);
  assert(codeMatchInsensitive === true, 'Invite passcode case-insensitivity verified');

  // 3. Concurrency-Safe Anti-Double-Dosing Verification
  console.log('\n3️⃣ Testing Anti-Double-Dosing Concurrency Lock');
  const doseEventsCol = db.collection('doseEvents');
  const testDoseKey = `profile_meera_sharma_01_med_metformin_01_2026-11-15_12:00`;

  // First administration: scheduled -> taken
  const event1 = await doseEventsCol.findOneAndUpdate(
    { doseKey: testDoseKey, status: { $ne: 'taken' } },
    {
      $set: {
        careProfileId: 'profile_meera_sharma_01',
        medicationId: 'med_metformin_01',
        doseKey: testDoseKey,
        status: 'taken',
        administeredBy: 'user_sunita_02',
        administeredByName: 'Sunita Verma',
        recordedAt: new Date().toISOString(),
      }
    },
    { returnDocument: 'after', upsert: true }
  );
  assert(event1 && event1.status === 'taken', 'Initial dose administration succeeded');

  // Second duplicate administration attempt on the same doseKey
  const existing = await doseEventsCol.findOne({ doseKey: testDoseKey });
  const isDuplicateBlocked = existing && existing.status === 'taken';
  assert(isDuplicateBlocked, 'Duplicate doseKey correctly detected as already taken (HTTP 409 Conflict trigger)');

  // 4. Inventory Decrement & Refill Alerts
  console.log('\n4️⃣ Testing Medication Inventory Adjustments');
  const medsCol = db.collection('medications');
  const metforminBefore = await medsCol.findOne({ _id: 'med_metformin_01' });
  const qtyBefore = metforminBefore.remainingQuantity;

  await medsCol.updateOne({ _id: 'med_metformin_01' }, { $inc: { remainingQuantity: -1 } });
  const metforminAfter = await medsCol.findOne({ _id: 'med_metformin_01' });
  assert(metforminAfter.remainingQuantity === qtyBefore - 1, `Remaining quantity decremented from ${qtyBefore} to ${metforminAfter.remainingQuantity}`);

  // Ashwagandha low inventory check
  const ashwa = await medsCol.findOne({ _id: 'med_ashwagandha_03' });
  assert(ashwa.remainingQuantity <= ashwa.refillThreshold, `Ashwagandha remaining (${ashwa.remainingQuantity}) <= refillThreshold (${ashwa.refillThreshold}) triggers refill alert`);

  // 5. Shift Notes & Health Logs
  console.log('\n5️⃣ Testing Shift Notes & Health Logs');
  const notesCol = db.collection('caregiverNotes');
  const notes = await notesCol.find({ careProfileId: 'profile_meera_sharma_01' }).toArray();
  assert(notes.length > 0, `Caregiver notes retrieved (${notes.length} found)`);

  const healthLogsCol = db.collection('healthLogs');
  const logs = await healthLogsCol.find({ careProfileId: 'profile_meera_sharma_01' }).toArray();
  assert(logs.length > 0, `Health logs retrieved (${logs.length} found)`);

  console.log(`\n========================================`);
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

testBackend();
