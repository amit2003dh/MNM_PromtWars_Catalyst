import test from 'node:test';
import assert from 'node:assert/strict';
import { sendEmail, sendStage3CaregiverEscalation, sendLowInventoryAlert } from '@/lib/email/sender';
import { isResendConfigured } from '@/lib/email/resend';
import { POST as cronPOST, GET as cronGET } from '@/app/api/cron/reminders/route';
import { getNotificationsCollection, getAuditLogsCollection, SEED_IDS } from '@/lib/db';

test('Resend Email Client & Reminder Escalation Suite', async (t) => {
  const originalKey = process.env.RESEND_API_KEY;

  await t.test('1. sendEmail returns structured simulation fallback without throwing when key is missing', async () => {
    delete process.env.RESEND_API_KEY;

    try {
      assert.equal(isResendConfigured(), false);

      const result = await sendEmail({
        to: 'caregiver.test@example.com',
        subject: 'Test Subject',
        html: '<p>Test email body</p>',
        text: 'Test email body',
      });

      assert.equal(result.success, true);
      assert.equal(result.simulated, true);
      assert.ok(result.messageId.startsWith('simulated-resend'));
      assert.deepEqual(result.recipients, ['caregiver.test@example.com']);
    } finally {
      if (originalKey) process.env.RESEND_API_KEY = originalKey;
    }
  });

  await t.test('2. sendStage3CaregiverEscalation renders emergency template and executes fallback cleanly', async () => {
    delete process.env.RESEND_API_KEY;

    try {
      const result = await sendStage3CaregiverEscalation('sunita.caregiver@example.com', {
        seniorName: 'Meera Sharma',
        medicineName: 'Metformin Hydrochloride',
        dosage: '500mg',
        category: 'allopathic',
        scheduledTime: '08:00 AM',
        minutesOverdue: 35,
        instructions: 'Take with breakfast',
        emergencyPhone: '+91 98765 43210',
        dashboardUrl: 'http://localhost:3000/dashboard',
      });

      assert.equal(result.success, true);
      assert.equal(result.simulated, true);
      assert.ok(result.recipients.includes('sunita.caregiver@example.com'));
    } finally {
      if (originalKey) process.env.RESEND_API_KEY = originalKey;
    }
  });

  await t.test('3. sendLowInventoryAlert dispatches inventory warning fallback cleanly', async () => {
    delete process.env.RESEND_API_KEY;

    try {
      const result = await sendLowInventoryAlert(['sunita@example.com', 'rahul@example.com'], {
        seniorName: 'Meera Sharma',
        medicineName: 'Amlodipine Besylate',
        dosage: '5mg',
        remainingQuantity: 4,
        refillThreshold: 7,
        daysRemaining: 4,
        pharmacyInfo: 'Apollo Pharmacy (+91 1800 200 1000)',
        dashboardUrl: 'http://localhost:3000/medications',
      });

      assert.equal(result.success, true);
      assert.equal(result.simulated, true);
      assert.equal(result.recipients.length, 2);
    } finally {
      if (originalKey) process.env.RESEND_API_KEY = originalKey;
    }
  });

  await t.test('4. POST /api/cron/reminders rejects unauthorized requests with 401 Unauthorized', async () => {
    process.env.CRON_SECRET = 'super-secret-cron-token-12345';

    try {
      // 4.1 Missing authorization
      const reqMissing = new Request('http://localhost:3000/api/cron/reminders', {
        method: 'POST',
      });
      const resMissing = await cronPOST(reqMissing);
      assert.equal(resMissing.status, 401, 'Request with missing secret must return 401');

      // 4.2 Invalid authorization token
      const reqInvalid = new Request('http://localhost:3000/api/cron/reminders', {
        method: 'POST',
        headers: {
          authorization: 'Bearer wrong-secret-token',
        },
      });
      const resInvalid = await cronPOST(reqInvalid);
      assert.equal(resInvalid.status, 401, 'Request with incorrect secret must return 401');
    } finally {
      process.env.CRON_SECRET = 'carenest-secret-cron-token-2026';
    }
  });

  await t.test('5. POST /api/cron/reminders runs reminder escalation ladder with valid authorization', async () => {
    const validSecret = process.env.CRON_SECRET || 'carenest-secret-cron-token-2026';

    const reqValid = new Request('http://localhost:3000/api/cron/reminders', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${validSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Simulate time 45 minutes after an overdue scheduled dose
        simulatedTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      }),
    });

    const resValid = await cronPOST(reqValid);
    assert.equal(resValid.status, 200, 'Authorized request should return 200 OK');

    const json = await resValid.json();
    assert.equal(json.success, true);
    assert.ok(typeof json.summary.stage1Created === 'number');
    assert.ok(typeof json.summary.stage2Created === 'number');
    assert.ok(typeof json.summary.stage3Escalated === 'number');
  });
});
