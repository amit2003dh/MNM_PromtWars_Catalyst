import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as administerDosePOST } from '@/app/api/doses/administer/route';
import { POST as medicationsPOST, GET as medicationsGET } from '@/app/api/medications/route';
import { POST as notesPOST } from '@/app/api/caregiver-notes/route';
import { POST as healthLogsPOST } from '@/app/api/health-logs/route';
import { GET as careProfilesGET, POST as careProfilesPOST } from '@/app/api/care-profiles/route';
import { POST as joinCirclePOST } from '@/app/api/care-profiles/join/route';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { SEED_IDS, getCareProfilesCollection, getCareMembershipsCollection } from '@/lib/db';

test('RBAC Authorization & Care Circle Isolation Suite', async (t) => {
  const CARE_PROFILE_ID = SEED_IDS.PROFILE_MEERA;
  const SENIOR_ID = SEED_IDS.USER_MEERA;
  const CAREGIVER_ID = SEED_IDS.USER_SUNITA;
  const FAMILY_ID = SEED_IDS.USER_RAHUL;

  await t.test('1. Caregiver has full administrative permissions', async () => {
    // 1.1 Caregiver can administer dose
    const doseKey = `rbac_caregiver_dose_${Date.now()}`;
    const reqDose = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': CAREGIVER_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicationId: SEED_IDS.MED_METFORMIN,
        doseKey,
        status: 'taken',
      }),
    });
    const resDose = await administerDosePOST(reqDose);
    assert.equal(resDose.status, 200, 'Caregiver should be authorized to administer dose');

    // 1.2 Caregiver can create medication
    const reqMed = new Request('http://localhost:3000/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': CAREGIVER_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicineName: 'Vitamin D3 Cholecalciferol',
        medicineCategory: 'otc',
        dosage: '60000 IU',
        instructions: 'Take 1 capsule once weekly after meal',
        frequency: 'weekly',
        scheduledTimes: ['10:00'],
        mealRelation: 'after_meal',
        pillColor: 'Golden',
        pillShape: 'Softgel',
        totalQuantity: 8,
        remainingQuantity: 8,
        refillThreshold: 2,
        startDate: '2026-02-01',
        status: 'active',
      }),
    });
    const resMed = await medicationsPOST(reqMed);
    assert.equal(resMed.status, 201, 'Caregiver should be authorized to add medication');

    // 1.3 Caregiver can write shift handoff note
    const reqNote = new Request('http://localhost:3000/api/caregiver-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': CAREGIVER_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        noteContent: 'Morning vitals normal: BP 124/82, Blood Glucose 118 mg/dL. Meera-ji ate light breakfast.',
      }),
    });
    const resNote = await notesPOST(reqNote);
    assert.equal(resNote.status, 201, 'Caregiver should be authorized to post shift notes');
  });

  await t.test('2. Senior role permissions and restrictions', async () => {
    // 2.1 Senior CAN mark own dose taken
    const doseKey = `rbac_senior_dose_${Date.now()}`;
    const reqDose = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SENIOR_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicationId: SEED_IDS.MED_METFORMIN,
        doseKey,
        status: 'taken',
      }),
    });
    const resDose = await administerDosePOST(reqDose);
    assert.equal(resDose.status, 200, 'Senior should be authorized to mark own dose taken');

    // 2.2 Senior CAN report symptoms
    const reqSymptom = new Request('http://localhost:3000/api/health-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SENIOR_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        symptom: 'dizziness',
        severity: 'mild',
        notes: 'Slight lightheadedness while standing up',
      }),
    });
    const resSymptom = await healthLogsPOST(reqSymptom);
    assert.equal(resSymptom.status, 201, 'Senior should be authorized to report symptoms');

    // 2.3 Senior CANNOT add medications (403 Forbidden)
    const reqMed = new Request('http://localhost:3000/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SENIOR_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicineName: 'Aspirin',
        medicineCategory: 'otc',
        dosage: '75mg',
        instructions: 'Self prescribed',
        frequency: 'daily',
        scheduledTimes: ['08:00'],
        mealRelation: 'after_meal',
        pillColor: 'White',
        pillShape: 'Round',
        totalQuantity: 30,
        remainingQuantity: 30,
        refillThreshold: 5,
        startDate: '2026-02-01',
      }),
    });
    const resMed = await medicationsPOST(reqMed);
    assert.equal(resMed.status, 403, 'Senior must receive 403 Forbidden when attempting to add medication');

    // 2.4 Senior CANNOT write caregiver shift handoff notes (403 Forbidden)
    const reqNote = new Request('http://localhost:3000/api/caregiver-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': SENIOR_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        noteContent: 'Shift note attempt by senior',
      }),
    });
    const resNote = await notesPOST(reqNote);
    assert.equal(resNote.status, 403, 'Senior must receive 403 Forbidden when attempting to post shift note');
  });

  await t.test('3. Family Member role permissions and restrictions', async () => {
    // 3.1 Family CANNOT administer doses (403 Forbidden — Read Only dose safety)
    const doseKey = `rbac_family_dose_${Date.now()}`;
    const reqDose = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': FAMILY_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicationId: SEED_IDS.MED_METFORMIN,
        doseKey,
        status: 'taken',
      }),
    });
    const resDose = await administerDosePOST(reqDose);
    assert.equal(resDose.status, 403, 'Family member must receive 403 Forbidden when attempting to mark dose');

    // 3.2 Family CANNOT add medications (403 Forbidden)
    const reqMed = new Request('http://localhost:3000/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': FAMILY_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicineName: 'Paracetamol',
        medicineCategory: 'otc',
        dosage: '500mg',
        instructions: 'Take for fever',
        frequency: 'as_needed',
        scheduledTimes: ['12:00'],
        mealRelation: 'after_meal',
        pillColor: 'White',
        pillShape: 'Round',
        totalQuantity: 10,
        remainingQuantity: 10,
        refillThreshold: 2,
        startDate: '2026-02-01',
      }),
    });
    const resMed = await medicationsPOST(reqMed);
    assert.equal(resMed.status, 403, 'Family member must receive 403 Forbidden when attempting to add medication');
  });

  await t.test('4. Care Circle Isolation prevents unauthorized cross-circle data access', async () => {
    const FOREIGN_CIRCLE_ID = 'profile_foreign_circle_999';

    // Attempting to query medications for an isolated care circle without membership
    const reqMeds = new Request(`http://localhost:3000/api/medications?careProfileId=${FOREIGN_CIRCLE_ID}`, {
      headers: { 'x-user-id': CAREGIVER_ID },
    });
    const resMeds = await medicationsGET(reqMeds);
    assert.equal(resMeds.status, 403, 'Cross-circle medication access must return 403 Forbidden');

    // Attempting to administer dose for an isolated care circle
    const reqAdminister = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': CAREGIVER_ID },
      body: JSON.stringify({
        careProfileId: FOREIGN_CIRCLE_ID,
        medicationId: 'med_foreign_01',
        doseKey: 'foreign_key_123',
        status: 'taken',
      }),
    });
    const resAdminister = await administerDosePOST(reqAdminister);
    assert.equal(resAdminister.status, 403, 'Cross-circle dose administration must return 403 Forbidden');
  });

  await t.test('5. Invite Passcode & Join Care Circle security', async () => {
    // 5.1 Register a new user
    const regReq = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `priya_${Date.now()}@example.com`,
        password: 'password123',
        name: 'Priya Sharma',
        role: 'family',
      }),
    });
    const regRes = await registerPOST(regReq);
    assert.equal(regRes.status, 201);
    const { user: newUser } = await regRes.json();

    // 5.2 Invalid invite code rejected with 404
    const reqBadCode = new Request('http://localhost:3000/api/care-profiles/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': newUser._id },
      body: JSON.stringify({
        inviteCode: 'WRONG_CODE_999',
      }),
    });
    const resBadCode = await joinCirclePOST(reqBadCode);
    assert.equal(resBadCode.status, 404, 'Invalid invite code must be rejected with 404');

    // 5.3 Valid invite code joins circle successfully
    // Meera Sharma's seed invite code is 'NEST72'
    const reqValidCode = new Request('http://localhost:3000/api/care-profiles/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': newUser._id },
      body: JSON.stringify({
        inviteCode: 'NEST72',
        role: 'family',
      }),
    });
    const resValidCode = await joinCirclePOST(reqValidCode);
    assert.equal(resValidCode.status, 200, 'Valid invite code must return 200 OK');

    const json = await resValidCode.json();
    assert.equal(json.success, true);
    assert.equal(json.profile.fullName, 'Meera Sharma');
  });
});
