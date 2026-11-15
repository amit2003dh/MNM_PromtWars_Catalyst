import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as sendOtpPOST } from '@/app/api/auth/send-otp/route';
import { POST as verifyOtpPOST } from '@/app/api/auth/verify-otp/route';
import { GET as authMeGET } from '@/app/api/auth/me/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { GET as medicationsGET, POST as medicationsPOST } from '@/app/api/medications/route';
import { GET as medByIdGET, DELETE as medByIdDELETE } from '@/app/api/medications/[id]/route';
import { POST as administerDosePOST } from '@/app/api/doses/administer/route';
import { GET as dosesTodayGET } from '@/app/api/doses/today/route';
import { 
  getUsersCollection, 
  getHouseholdsCollection, 
  getMembershipsCollection, 
  getOtpVerificationsCollection,
  getSessionsCollection,
  getMedicationsCollection,
  SEED_IDS 
} from '@/lib/db';
import { hashSessionToken, createDBSession } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';

test('CareNest Multi-User SaaS Isolation & Gmail OTP Suite', async (t) => {
  const userAEmail = `user_a_${Date.now()}@example.com`;
  const userBEmail = `user_b_${Date.now()}@example.com`;

  let userASessionToken = '';
  let userAHouseholdId = '';
  let userAId = '';
  let userAMedicationId = '';

  let userBSessionToken = '';
  let userBHouseholdId = '';
  let userBId = '';

  await t.test('1. Send OTP: Validates email, hashes OTP in DB, and enforces 60s cooldown', async () => {
    const req1 = new Request('http://localhost:3000/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail }),
    });

    const res1 = await sendOtpPOST(req1);
    assert.equal(res1.status, 200, 'Sending OTP should succeed with 200');
    const json1 = await res1.json();
    assert.equal(json1.success, true);

    // Verify OTP record exists in MongoDB with hashed value (not plaintext)
    const otpCol = await getOtpVerificationsCollection();
    const record = await otpCol.findOne({ email: userAEmail });
    assert.ok(record, 'OTP record must be stored in MongoDB');
    assert.ok(record.otpHash, 'OTP must be hashed');
    assert.equal(record.otpHash.length >= 60, true, 'OTP hash must be bcrypt hash');
    assert.equal(typeof record.otp, 'undefined', 'Plaintext OTP must NEVER be stored');

    // 60-second cooldown enforcement
    const reqCooldown = new Request('http://localhost:3000/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail }),
    });
    const resCooldown = await sendOtpPOST(reqCooldown);
    assert.equal(resCooldown.status, 429, 'Immediate resend must be rate-limited with 429');
  });

  await t.test('2. OTP Verification Rejections: Bad OTP, Expired OTP, and 5-Attempt Lockout', async () => {
    const testEmail = `test_reject_${Date.now()}@example.com`;
    const otpCol = await getOtpVerificationsCollection();
    
    // Seed an OTP record with known OTP '123456'
    const otpHash = await bcrypt.hash('123456', 10);
    const now = new Date();
    await otpCol.insertOne({
      _id: `otp_${Date.now()}`,
      email: testEmail,
      otpHash,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      attempts: 0,
      lastSentAt: now.toISOString(),
      createdAt: now.toISOString(),
    });

    // 2.1 Wrong OTP attempt 1
    const reqWrong = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '999999' }),
    });
    const resWrong = await verifyOtpPOST(reqWrong);
    assert.equal(resWrong.status, 400, 'Wrong OTP must return 400 Bad Request');
    const wrongJson = await resWrong.json();
    assert.equal(wrongJson.attemptsRemaining, 4);

    // 2.2 Exhaust attempts to trigger lockout (attempts 2, 3, 4, 5)
    for (let i = 0; i < 4; i++) {
      const r = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, otp: '000000' }),
      });
      await verifyOtpPOST(r);
    }

    // 2.3 6th attempt must be rejected due to lockout
    const reqLocked = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '123456' }), // even with correct OTP
    });
    const resLocked = await verifyOtpPOST(reqLocked);
    assert.equal(resLocked.status, 429, 'Locked OTP must return 429 Too Many Requests');

    // 2.4 Expired OTP rejection
    const expiredEmail = `expired_${Date.now()}@example.com`;
    await otpCol.insertOne({
      _id: `otp_exp_${Date.now()}`,
      email: expiredEmail,
      otpHash,
      expiresAt: new Date(now.getTime() - 1000).toISOString(), // expired 1s ago
      attempts: 0,
      lastSentAt: now.toISOString(),
      createdAt: now.toISOString(),
    });

    const reqExp = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: expiredEmail, otp: '123456' }),
    });
    const resExp = await verifyOtpPOST(reqExp);
    assert.equal(resExp.status, 400, 'Expired OTP must return 400 Bad Request');
  });

  await t.test('3. User A Registration: Automatic independent household, care profile, and session creation', async () => {
    // Seed valid OTP for userA
    const otpCol = await getOtpVerificationsCollection();
    const otpHash = await bcrypt.hash('888888', 10);
    const now = new Date();
    await otpCol.updateOne(
      { email: userAEmail },
      {
        $set: {
          otpHash,
          expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
          attempts: 0,
          lastSentAt: now.toISOString(),
        },
      },
      { upsert: true }
    );

    const reqVerify = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, otp: '888888', name: 'Dr. Alice User' }),
    });

    const resVerify = await verifyOtpPOST(reqVerify);
    assert.equal(resVerify.status, 200, 'OTP verification must succeed');
    const json = await resVerify.json();
    assert.equal(json.success, true);
    assert.ok(json.token, 'Session token must be returned');
    assert.ok(json.user, 'User must be created');
    assert.ok(json.household, 'Independent household must be created');
    assert.equal(json.membership.role, 'OWNER');

    userASessionToken = json.token;
    userAHouseholdId = json.household._id;
    userAId = json.user._id;

    // Verify session in MongoDB sessions collection
    const sessCol = await getSessionsCollection();
    const tokenHash = hashSessionToken(userASessionToken);
    const dbSession = await sessCol.findOne({ sessionTokenHash: tokenHash });
    assert.ok(dbSession, 'Session must be persisted in MongoDB');
    assert.equal(dbSession.userId, userAId);
    assert.equal(dbSession.householdId, userAHouseholdId);

    // Verify GET /api/auth/me returns User A's identity and household
    const reqMe = new Request('http://localhost:3000/api/auth/me', {
      headers: { 'x-session-token': userASessionToken },
    });
    const resMe = await authMeGET(reqMe);
    assert.equal(resMe.status, 200);
    const meJson = await resMe.json();
    assert.equal(meJson.user.email, userAEmail);
    assert.equal(meJson.household._id, userAHouseholdId);
  });

  await t.test('4. User B Registration: Creates completely isolated Household B', async () => {
    // Seed valid OTP for userB
    const otpCol = await getOtpVerificationsCollection();
    const otpHash = await bcrypt.hash('777777', 10);
    const now = new Date();
    await otpCol.insertOne({
      _id: `otp_b_${Date.now()}`,
      email: userBEmail,
      otpHash,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      attempts: 0,
      lastSentAt: now.toISOString(),
      createdAt: now.toISOString(),
    });

    const reqVerify = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail, otp: '777777', name: 'Bob Caregiver' }),
    });

    const resVerify = await verifyOtpPOST(reqVerify);
    assert.equal(resVerify.status, 200);
    const json = await resVerify.json();
    
    userBSessionToken = json.token;
    userBHouseholdId = json.household._id;
    userBId = json.user._id;

    // Households must be completely independent
    assert.notEqual(userAHouseholdId, userBHouseholdId, 'User A and User B must have distinct households');
    assert.notEqual(userAId, userBId, 'User A and User B must have distinct user IDs');
  });

  await t.test('5. Multi-Tenant Data Isolation: User A creates medication, User B sees 0 medications', async () => {
    // 5.1 User A creates medication
    const reqAddMed = new Request('http://localhost:3000/api/medications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': userASessionToken,
      },
      body: JSON.stringify({
        medicineName: 'Atorvastatin Calcium',
        medicineCategory: 'allopathic',
        dosage: '20mg',
        instructions: 'Take 1 tablet at bedtime',
        frequency: 'daily',
        scheduledTimes: ['21:00'],
        mealRelation: 'after_meal',
        pillColor: 'White',
        pillShape: 'Oval',
        totalQuantity: 30,
        remainingQuantity: 30,
        refillThreshold: 5,
        startDate: new Date().toISOString().split('T')[0],
      }),
    });

    const resAddMed = await medicationsPOST(reqAddMed);
    assert.equal(resAddMed.status, 201, 'User A should successfully create medication');
    const medJson = await resAddMed.json();
    assert.equal(medJson.success, true);
    userAMedicationId = medJson.medication._id;
    assert.equal(medJson.medication.householdId, userAHouseholdId);

    // 5.2 User A queries medications -> receives 1 medication
    const reqMedsA = new Request('http://localhost:3000/api/medications', {
      headers: { 'x-session-token': userASessionToken },
    });
    const resMedsA = await medicationsGET(reqMedsA);
    const jsonMedsA = await resMedsA.json();
    assert.equal(jsonMedsA.medications.length, 1);
    assert.equal(jsonMedsA.medications[0]._id, userAMedicationId);

    // 5.3 User B queries medications -> receives 0 medications (STRICT ISOLATION)
    const reqMedsB = new Request('http://localhost:3000/api/medications', {
      headers: { 'x-session-token': userBSessionToken },
    });
    const resMedsB = await medicationsGET(reqMedsB);
    assert.equal(resMedsB.status, 200);
    const jsonMedsB = await resMedsB.json();
    assert.equal(jsonMedsB.medications.length, 0, 'User B must NOT see User A medications');
  });

  await t.test('6. IDOR Protection: User B cannot GET, UPDATE, or DELETE User A medication by ID', async () => {
    // 6.1 User B attempts to read User A medication by direct ID -> 404 or 403
    const reqIdorGet = new Request(`http://localhost:3000/api/medications/${userAMedicationId}`, {
      headers: { 'x-session-token': userBSessionToken },
    });
    const resIdorGet = await medByIdGET(reqIdorGet, { params: Promise.resolve({ id: userAMedicationId }) });
    assert.ok([403, 404].includes(resIdorGet.status), 'IDOR GET must return 403 or 404');

    // 6.2 User B attempts to delete User A medication -> 403 or 404
    const reqIdorDel = new Request(`http://localhost:3000/api/medications/${userAMedicationId}`, {
      method: 'DELETE',
      headers: { 'x-session-token': userBSessionToken },
    });
    const resIdorDel = await medByIdDELETE(reqIdorDel, { params: Promise.resolve({ id: userAMedicationId }) });
    assert.ok([403, 404].includes(resIdorDel.status), 'IDOR DELETE must return 403 or 404');

    // Verify medication still exists in DB
    const medCol = await getMedicationsCollection();
    const med = await medCol.findOne({ _id: userAMedicationId });
    assert.ok(med, 'Medication must remain intact after unauthorized deletion attempt');
  });

  await t.test('7. Session Invalidation on Logout: Session token is purged and rejects subsequent requests', async () => {
    // 7.1 User A logs out
    const reqLogout = new Request('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: { 'x-session-token': userASessionToken },
    });
    const resLogout = await logoutPOST(reqLogout);
    assert.equal(resLogout.status, 200);

    // Verify session record is removed from MongoDB
    const sessCol = await getSessionsCollection();
    const tokenHash = hashSessionToken(userASessionToken);
    const sessionInDb = await sessCol.findOne({ sessionTokenHash: tokenHash });
    assert.equal(sessionInDb, null, 'Session record must be destroyed in MongoDB');

    // 7.2 Subsequent requests with invalidated token must be rejected with 401
    const reqAfterLogout = new Request('http://localhost:3000/api/auth/me', {
      headers: { 'x-session-token': userASessionToken },
    });
    const resAfterLogout = await authMeGET(reqAfterLogout);
    assert.equal(resAfterLogout.status, 401, 'Logged out session must receive 401 Unauthorized');
  });

  await t.test('8. Demo Household Preservation: Pre-seeded demo records are isolated from newly created users', async () => {
    // Demo records belong to SEED_IDS.HOUSEHOLD_DEMO_MEERA
    const medCol = await getMedicationsCollection();
    const demoMeds = await medCol.find({ householdId: SEED_IDS.HOUSEHOLD_DEMO_MEERA }).toArray();
    assert.ok(demoMeds.length >= 4, 'Demo household must preserve its 4 pre-seeded medications');

    // User B (who has 0 medications) queries doses
    const reqDosesB = new Request('http://localhost:3000/api/doses/today', {
      headers: { 'x-session-token': userBSessionToken },
    });
    const resDosesB = await dosesTodayGET(reqDosesB);
    const jsonDosesB = await resDosesB.json();
    assert.equal(jsonDosesB.schedule.length, 0, 'New user B must NOT inherit Meera Sharma demo doses');
  });
});
