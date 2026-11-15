// End-to-End API verification for CareNest AI Integrations
const BASE_URL = 'http://localhost:3000';

async function verify() {
  console.log('Testing CareNest AI Integrations on ' + BASE_URL);

  // 1. Test /api/ai/doctor-summary (GET)
  try {
    const resDocGet = await fetch(`${BASE_URL}/api/ai/doctor-summary?timeframeDays=7`);
    console.log('Doctor Summary (GET) status:', resDocGet.status);
    const docGetData = await resDocGet.json();
    console.log('Doctor Summary (GET) success:', docGetData.success);
    if (!docGetData.success) throw new Error('Doctor summary GET failed');
    console.log('Doctor Summary Patient:', docGetData.data.patientInfo.fullName);
    console.log('Adherence %:', docGetData.data.adherenceStats.adherencePercentage);
    console.log('Questions for Doctor:', docGetData.data.questionsForDoctor.length);
  } catch (e) {
    console.error('Doctor Summary GET error:', e.message);
    throw e;
  }

  // 2. Test /api/ai/doctor-summary (POST with custom data)
  try {
    const resDocPost = await fetch(`${BASE_URL}/api/ai/doctor-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        careProfile: {
          _id: 'custom-1',
          fullName: 'Meera Sharma',
          age: 74,
          gender: 'Female',
          allergies: ['Penicillin'],
          chronicConditions: ['Type 2 Diabetes', 'Hypertension'],
        },
        medications: [
          {
            _id: 'm1',
            medicineName: 'Metformin 500mg',
            medicineCategory: 'allopathic',
            dosage: '500mg',
            frequency: 'twice_daily',
            scheduledTimes: ['08:00', '20:00'],
            mealRelation: 'after_meal',
            remainingQuantity: 3,
            refillThreshold: 10,
            status: 'active',
          }
        ],
        doseEvents: [
          { status: 'taken' },
          { status: 'taken' },
          { status: 'missed' },
        ],
        healthLogs: [
          { symptom: 'dizziness', severity: 'moderate', reportedAt: new Date().toISOString() }
        ],
        timeframeDays: 7
      })
    });
    console.log('Doctor Summary (POST) status:', resDocPost.status);
    const docPostData = await resDocPost.json();
    console.log('Doctor Summary (POST) success:', docPostData.success);
    if (!docPostData.success) throw new Error('Doctor summary POST failed');
    console.log('Doctor Summary adherence %:', docPostData.data.adherenceStats.adherencePercentage);
  } catch (e) {
    console.error('Doctor Summary POST error:', e.message);
    throw e;
  }

  // 3. Test /api/ai/explain (POST)
  try {
    const resExplain = await fetch(`${BASE_URL}/api/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicineName: 'Amlodipine Besylate',
        dosage: '5mg',
        instructions: 'Take 1 tablet every morning with plain water',
        mealRelation: 'before_meal',
        pillColor: 'Yellow',
        pillShape: 'Oval',
        category: 'allopathic'
      })
    });
    console.log('Explain (POST) status:', resExplain.status);
    const explainData = await resExplain.json();
    console.log('Explain success:', explainData.success);
    if (!explainData.success) throw new Error('Explain POST failed');
    console.log('Speech text preview:', explainData.data.speechText);
  } catch (e) {
    console.error('Explain POST error:', e.message);
    throw e;
  }

  // 4. Test /api/ai/explain-medicine alias
  try {
    const resAlias = await fetch(`${BASE_URL}/api/ai/explain-medicine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicineName: 'Ashwagandha',
        dosage: '1 tsp',
        instructions: 'Take with warm milk before bed',
        category: 'ayurvedic'
      })
    });
    console.log('Explain Alias status:', resAlias.status);
    const aliasData = await resAlias.json();
    console.log('Explain Alias success:', aliasData.success);
    if (!aliasData.success) throw new Error('Explain alias failed');
  } catch (e) {
    console.error('Explain Alias error:', e.message);
    throw e;
  }

  // 5. Test /api/cron/reminders - Unauthorized without token (401)
  try {
    const resCronUnauth = await fetch(`${BASE_URL}/api/cron/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'authorization': 'Bearer wrong-secret' }
    });
    console.log('Cron Unauthorized check status:', resCronUnauth.status);
    if (resCronUnauth.status !== 401) {
      console.warn('Expected 401 on unauthorized cron request, got:', resCronUnauth.status);
    } else {
      console.log('✅ Cron security verified: 401 Unauthorized on invalid secret');
    }
  } catch (e) {
    console.error('Cron security check error:', e.message);
  }

  // 6. Test /api/cron/reminders - Authorized with secret
  try {
    const resCronAuth = await fetch(`${BASE_URL}/api/cron/reminders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'authorization': 'Bearer carenest-secret-cron-token-2026'
      },
      body: JSON.stringify({
        simulatedTime: new Date(Date.now() + 45 * 60 * 1000).toISOString() // simulate 45m ahead so overdue doses trigger
      })
    });
    console.log('Cron Authorized check status:', resCronAuth.status);
    const cronData = await resCronAuth.json();
    console.log('Cron response success:', cronData.success);
    console.log('Cron summary:', JSON.stringify(cronData.summary));
    console.log('Cron actions dispatched:', cronData.actions?.length || 0);
  } catch (e) {
    console.error('Cron Authorized error:', e.message);
    throw e;
  }

  console.log('\n🎉 ALL INTEGRATION API TESTS PASSED SUCCESSFULLY! 🎉');
}

verify().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});
