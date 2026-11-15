import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as administerDosePOST } from '@/app/api/doses/administer/route';
import { 
  getMedicationsCollection, 
  getDoseEventsCollection, 
  getNotificationsCollection, 
  getAuditLogsCollection,
  SEED_IDS 
} from '@/lib/db';

test('Concurrency-Safe Atomic Dose Administration & Anti-Double-Dosing Suite', async (t) => {
  const CARE_PROFILE_ID = SEED_IDS.PROFILE_MEERA;
  const MEDICATION_ID = SEED_IDS.MED_METFORMIN;
  const CAREGIVER_ID = SEED_IDS.USER_SUNITA;

  await t.test('1. Valid dose administration records dose and decrements inventory', async () => {
    const medCol = await getMedicationsCollection();
    const initialMed = await medCol.findOne({ _id: MEDICATION_ID });
    const initialQty = initialMed.remainingQuantity;

    const uniqueKey = `test_dose_${Date.now()}_01`;
    const req = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': CAREGIVER_ID,
      },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicationId: MEDICATION_ID,
        doseKey: uniqueKey,
        scheduledAt: new Date().toISOString(),
        status: 'taken',
        notes: 'Administered with water after breakfast',
      }),
    });

    const res = await administerDosePOST(req);
    assert.equal(res.status, 200, 'First administration should succeed with 200');

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.doseEvent.doseKey, uniqueKey);
    assert.equal(json.doseEvent.status, 'taken');
    assert.equal(json.doseEvent.administeredBy, CAREGIVER_ID);
    assert.equal(json.doseEvent.administeredByName, 'Sunita Verma');
    assert.equal(json.remainingQuantity, initialQty - 1, 'Inventory should decrease by 1');

    // Verify DB state
    const updatedMed = await medCol.findOne({ _id: MEDICATION_ID });
    assert.equal(updatedMed.remainingQuantity, initialQty - 1);
  });

  await t.test('2. Sequential duplicate doseKey triggers HTTP 409 Conflict with safety details', async () => {
    const uniqueKey = `test_dose_sequential_${Date.now()}`;
    const makeReq = () => new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': CAREGIVER_ID,
      },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicationId: MEDICATION_ID,
        doseKey: uniqueKey,
        scheduledAt: new Date().toISOString(),
        status: 'taken',
        notes: 'First attempt',
      }),
    });

    // 1st request -> 200
    const res1 = await administerDosePOST(makeReq());
    assert.equal(res1.status, 200);

    const medCol = await getMedicationsCollection();
    const medAfterFirst = await medCol.findOne({ _id: MEDICATION_ID });
    const qtyAfterFirst = medAfterFirst.remainingQuantity;

    // 2nd request with exact same doseKey -> 409 Conflict
    const res2 = await administerDosePOST(makeReq());
    assert.equal(res2.status, 409, 'Duplicate doseKey must return 409 Conflict');

    const conflictJson = await res2.json();
    assert.equal(conflictJson.alreadyAdministered, true);
    assert.equal(conflictJson.doseKey, uniqueKey);
    assert.equal(conflictJson.administeredBy, CAREGIVER_ID);
    assert.ok(conflictJson.recordedAt, 'Must include original administration timestamp');

    // Inventory must NOT decrease again
    const medAfterSecond = await medCol.findOne({ _id: MEDICATION_ID });
    assert.equal(medAfterSecond.remainingQuantity, qtyAfterFirst, 'Inventory must not double decrement');
  });

  await t.test('3. Concurrent race condition: 5 simultaneous requests with identical doseKey yields 1 success and 4 conflicts', async () => {
    const concurrentKey = `test_dose_race_${Date.now()}`;
    const medCol = await getMedicationsCollection();
    const beforeMed = await medCol.findOne({ _id: MEDICATION_ID });
    const beforeQty = beforeMed.remainingQuantity;

    const makeReq = (idx) => new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': CAREGIVER_ID,
      },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicationId: MEDICATION_ID,
        doseKey: concurrentKey,
        scheduledAt: new Date().toISOString(),
        status: 'taken',
        notes: `Concurrent call #${idx}`,
      }),
    });

    const requests = [makeReq(1), makeReq(2), makeReq(3), makeReq(4), makeReq(5)];
    const responses = await Promise.all(requests.map(r => administerDosePOST(r)));
    const statuses = responses.map(r => r.status);

    const successCount = statuses.filter(s => s === 200).length;
    const conflictCount = statuses.filter(s => s === 409).length;

    assert.equal(successCount, 1, 'Exactly one concurrent request must succeed with 200');
    assert.equal(conflictCount, 4, 'Remaining 4 concurrent requests must be rejected with 409');

    // Verify inventory only decremented once
    const afterMed = await medCol.findOne({ _id: MEDICATION_ID });
    assert.equal(afterMed.remainingQuantity, beforeQty - 1, 'Inventory should only decrement once across all concurrent calls');
  });

  await t.test('4. Schema validation rejects invalid payloads with 400 Bad Request', async () => {
    // Missing doseKey
    const reqMissingKey = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': CAREGIVER_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicationId: MEDICATION_ID,
      }),
    });
    const res1 = await administerDosePOST(reqMissingKey);
    assert.equal(res1.status, 400);

    // Invalid status
    const reqInvalidStatus = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': CAREGIVER_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicationId: MEDICATION_ID,
        doseKey: 'valid_key_123',
        status: 'discarded_invalid',
      }),
    });
    const res2 = await administerDosePOST(reqInvalidStatus);
    assert.equal(res2.status, 400);
  });

  await t.test('5. Refill notification triggered when quantity drops to/below threshold', async () => {
    const medCol = await getMedicationsCollection();
    // Use Amlodipine which has threshold 7 and low remaining quantity
    const amlodipine = await medCol.findOne({ _id: SEED_IDS.MED_AMLODIPINE });
    
    // Set quantity right at threshold + 1
    await medCol.updateOne({ _id: SEED_IDS.MED_AMLODIPINE }, { $set: { remainingQuantity: amlodipine.refillThreshold + 1 } });

    const refillKey = `test_dose_refill_${Date.now()}`;
    const req = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': CAREGIVER_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicationId: SEED_IDS.MED_AMLODIPINE,
        doseKey: refillKey,
        status: 'taken',
      }),
    });

    const res = await administerDosePOST(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.remainingQuantity, amlodipine.refillThreshold, 'Should now be exactly at threshold');

    // Check notifications collection
    const notifsCol = await getNotificationsCollection();
    const refillAlert = await notifsCol.findOne({ 
      careProfileId: CARE_PROFILE_ID, 
      type: 'refill',
      title: { $regex: 'Amlodipine' } 
    });
    assert.ok(refillAlert, 'Refill alert notification must be created');
  });

  await t.test('6. Dose administration records tamper-evident audit log entry', async () => {
    const auditKey = `test_audit_key_${Date.now()}`;
    const req = new Request('http://localhost:3000/api/doses/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': CAREGIVER_ID },
      body: JSON.stringify({
        careProfileId: CARE_PROFILE_ID,
        medicationId: MEDICATION_ID,
        doseKey: auditKey,
        status: 'taken',
      }),
    });

    const res = await administerDosePOST(req);
    assert.equal(res.status, 200);

    const auditCol = await getAuditLogsCollection();
    const allLogs = await auditCol.find({ 
      careProfileId: CARE_PROFILE_ID, 
      action: 'ADMINISTER_DOSE'
    }).toArray();
    const log = allLogs.find(l => l.details?.doseKey === auditKey);

    assert.ok(log, 'Audit log entry must be created');
    assert.equal(log.actorId, CAREGIVER_ID);
    assert.equal(log.actorName, 'Sunita Verma');
  });
});
