import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { getNotificationsCollection, logAudit } from '@/lib/db';
import { NotificationRecord } from '@/types';

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const body = await request.json().catch(() => ({}));
    const targetEmail = (body.email && body.email.includes('@')) ? body.email.trim() : auth.user.email;

    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email address is required' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' });

    const emailSubject = `✅ CareNest AI — Automated Email Delivery Verification`;
    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f0fdf4; padding: 24px; color: #1e293b;">
  <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 2px solid #22c55e; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <h2 style="color: #15803d; margin: 0; font-size: 22px;">✅ Notification System Online</h2>
    </div>
    <p style="font-size: 15px; line-height: 1.6;">
      Hello <strong>${auth.user.name}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6;">
      This email confirms that your <strong>CareNest AI Automated Alert & Delivery Pipeline</strong> is live and operational for <strong>${auth.household?.name || 'Your Household'}</strong>.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px;">
      <tr>
        <td style="padding: 10px 14px; font-weight: bold; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0;">Recipient:</td>
        <td style="padding: 10px 14px; font-size: 14px; border-bottom: 1px solid #e2e8f0;"><strong>${targetEmail}</strong></td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: bold; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0;">Verification Time:</td>
        <td style="padding: 10px 14px; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: bold; color: #64748b; font-size: 13px;">Security & Isolation:</td>
        <td style="padding: 10px 14px; font-size: 14px; color: #15803d; font-weight: bold;">Household Scoped • Verified</td>
      </tr>
    </table>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      You will receive alerts here for missed dose escalations (+30 mins), low medication inventory reorders, emergency SOS broadcasts, and doctor appointment reminders.
    </p>
  </div>
</body>
</html>
    `.trim();

    const result = await sendEmail({
      to: targetEmail,
      subject: emailSubject,
      html: emailHtml,
      text: `CareNest AI Email Delivery Verified for ${targetEmail} at ${formattedDate}.`,
    });

    // Record notification in DB for outbox proof
    const notifsCol = await getNotificationsCollection();
    const alertId = `notif_test_${Date.now()}`;
    const notification: NotificationRecord = {
      _id: alertId,
      householdId: auth.householdId,
      careProfileId: 'profile_default',
      title: 'Email Delivery Operational Verification',
      message: `Test alert successfully dispatched to ${targetEmail} via ${result.provider === 'gmail_smtp' ? 'Gmail SMTP' : result.provider === 'resend' ? 'Resend' : 'Live Outbox'}.`,
      type: 'missed_dose',
      priority: 'low',
      stage: 1,
      status: 'read',
      sentViaEmail: true,
      deliveryStatus: result.simulated ? 'outbox_preview' : 'sent_email',
      createdAt: nowIso,
    };

    await notifsCol.insertOne(notification);

    await logAudit({
      householdId: auth.householdId,
      careProfileId: 'profile_default',
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'OWNER',
      action: 'SEND_TEST_EMAIL',
      entityType: 'notification',
      entityId: alertId,
      details: {
        targetEmail,
        provider: result.provider,
        simulated: result.simulated,
        messageId: result.messageId,
      },
    });

    return NextResponse.json({
      success: true,
      deliveredTo: targetEmail,
      provider: result.provider,
      simulated: result.simulated,
      messageId: result.messageId,
      timestamp: formattedDate,
    });
  } catch (err: any) {
    console.error('[API Test Email] Error:', err);
    return NextResponse.json({ error: 'Failed to send test email', details: err?.message }, { status: 500 });
  }
}
