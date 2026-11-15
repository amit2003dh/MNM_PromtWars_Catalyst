import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { 
  getCareProfilesCollection, 
  getMembershipsCollection, 
  getNotificationsCollection, 
  logAudit 
} from '@/lib/db';
import { sendEmergencyAlertEmail } from '@/lib/email';
import { NotificationRecord } from '@/types';

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const profilesCol = await getCareProfilesCollection();
    let profile = await profilesCol.findOne({ householdId: auth.householdId });
    if (!profile) {
      profile = await profilesCol.findOne({ _id: 'profile_meera_01' });
    }

    const patientName = profile ? (profile.preferredName || profile.fullName) : 'Family Member';
    const triggeredByName = auth.user.name || 'Care Circle Member';
    const nowIso = new Date().toISOString();
    const formattedTime = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Collect recipient emails: all active care circle members + emergency contacts
    const memCol = await getMembershipsCollection();
    const members = await memCol.find({ householdId: auth.householdId, status: 'active' }).toArray();
    
    const recipientEmailsSet = new Set<string>();
    
    // Always include user's own email if valid
    if (auth.user.email && auth.user.email.includes('@')) {
      recipientEmailsSet.add(auth.user.email);
    }

    for (const m of members) {
      if (m.userEmail && m.userEmail.includes('@')) {
        recipientEmailsSet.add(m.userEmail);
      }
    }

    const recipientEmails = Array.from(recipientEmailsSet);
    if (recipientEmails.length === 0) {
      recipientEmails.push(auth.user.email || 'emergency@carenest.ai');
    }

    // Dispatch real Emergency SOS email
    const emailResult = await sendEmergencyAlertEmail(recipientEmails, {
      patientName,
      triggeredByName,
      timestamp: formattedTime,
      emergencyContacts: profile?.emergencyContacts || [],
      allergies: profile?.allergies || [],
      chronicConditions: profile?.chronicConditions || [],
      dashboardUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://mnm-promt-wars-catalyst.vercel.app',
    });

    // Save notification in database
    const notifsCol = await getNotificationsCollection();
    const alertId = `notif_sos_${Date.now()}`;
    const notification: NotificationRecord = {
      _id: alertId,
      householdId: auth.householdId,
      careProfileId: profile?._id || 'profile_default',
      title: `🚨 EMERGENCY SOS ACTIVATED FOR ${patientName.toUpperCase()}`,
      message: `Emergency broadcast triggered by ${triggeredByName} at ${formattedTime}. Care circle members notified via ${emailResult.provider === 'gmail_smtp' ? 'Gmail SMTP' : emailResult.provider === 'resend' ? 'Resend Email' : 'Live Outbox'}.`,
      type: 'missed_dose',
      priority: 'urgent',
      stage: 3,
      status: 'unread',
      sentViaEmail: true,
      deliveryStatus: emailResult.simulated ? 'outbox_preview' : 'sent_email',
      createdAt: nowIso,
    };

    await notifsCol.insertOne(notification);

    // Record audit log
    await logAudit({
      householdId: auth.householdId,
      careProfileId: profile?._id || 'profile_default',
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'OWNER',
      action: 'TRIGGER_EMERGENCY_SOS',
      entityType: 'notification',
      entityId: alertId,
      details: {
        patientName,
        recipients: recipientEmails,
        emailProvider: emailResult.provider,
        simulated: emailResult.simulated,
        messageId: emailResult.messageId,
      },
    });

    return NextResponse.json({
      success: true,
      alertId,
      patientName,
      triggeredByName,
      timestamp: formattedTime,
      recipients: recipientEmails,
      emailProvider: emailResult.provider,
      simulated: emailResult.simulated,
      messageId: emailResult.messageId,
      emergencyContacts: profile?.emergencyContacts || [],
    });
  } catch (err: any) {
    console.error('[API Emergency Trigger] Error:', err);
    return NextResponse.json(
      { error: 'Failed to process emergency trigger', details: err?.message },
      { status: 500 }
    );
  }
}
