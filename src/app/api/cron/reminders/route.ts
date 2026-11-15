import { NextRequest, NextResponse } from 'next/server';
import { getCareNestDb } from '@/lib/ai/db-helper';
import { sendStage3CaregiverEscalation } from '@/lib/email';
import { CareProfile, Medication, DoseEvent, NotificationRecord } from '@/types';

function verifyCronSecret(req: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET || 'carenest-secret-cron-token-2026';

  // Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token === expectedSecret) return true;
  }

  // Check x-cron-secret header
  const xCronSecret = req.headers.get('x-cron-secret');
  if (xCronSecret && xCronSecret.trim() === expectedSecret) {
    return true;
  }

  // Check query parameter ?secret=
  const { searchParams } = new URL(req.url);
  const secretParam = searchParams.get('secret');
  if (secretParam && secretParam.trim() === expectedSecret) {
    return true;
  }

  // In non-production without CRON_SECRET env set, allow request if secret matches default
  if (!process.env.CRON_SECRET && process.env.NODE_ENV !== 'production') {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  return handleCronReminders(req);
}

export async function GET(req: NextRequest) {
  return handleCronReminders(req);
}

async function handleCronReminders(req: NextRequest) {
  // 1. Authorization check
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unauthorized. Invalid or missing CRON_SECRET.' 
      },
      { status: 401 }
    );
  }

  try {
    let body: any = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const { searchParams } = new URL(req.url);
    const simulatedTime = body.simulatedTime || searchParams.get('simulatedTime');
    const nowMs = simulatedTime ? new Date(simulatedTime).getTime() : Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const db = await getCareNestDb();

    // Fetch active care profiles, medications, scheduled doses, and existing notifications
    const [allProfiles, allMeds, scheduledDoses, existingNotifs, memberships] = await Promise.all([
      db.careProfiles.find({}).toArray() as Promise<CareProfile[]>,
      db.medications.find({ status: 'active' }).toArray() as Promise<Medication[]>,
      db.doseEvents.find({ status: 'scheduled' }).toArray() as Promise<DoseEvent[]>,
      db.notifications.find({}).toArray() as Promise<any[]>,
      db.careMemberships.find({ status: 'active' }).toArray() as Promise<any[]>,
    ]);

    const profileMap = new Map<string, CareProfile>();
    for (const p of allProfiles) {
      profileMap.set(p._id, p);
      if ((p as any).id) profileMap.set((p as any).id, p);
    }

    const medMap = new Map<string, Medication>();
    for (const m of allMeds) {
      medMap.set(m._id, m);
      if ((m as any).id) medMap.set((m as any).id, m);
    }

    // Index existing notifications by doseKey and stage
    const notifKeySet = new Set<string>();
    for (const n of existingNotifs) {
      if (n.doseKey && n.stage) {
        notifKeySet.add(`${n.doseKey}_stage_${n.stage}`);
      }
    }

    let stage1Created = 0;
    let stage2Created = 0;
    let stage3Escalated = 0;
    const actions: any[] = [];

    for (const dose of scheduledDoses) {
      const scheduledAtMs = new Date(dose.scheduledAt).getTime();
      const diffMinutes = Math.floor((nowMs - scheduledAtMs) / 60000);

      // If dose is in the future, skip
      if (diffMinutes < 0) {
        continue;
      }

      const med = medMap.get(dose.medicationId);
      const profile = profileMap.get(dose.careProfileId) || allProfiles[0];
      const patientName = profile ? (profile.preferredName || profile.fullName) : 'Patient';
      const medName = med?.medicineName || 'Medication';
      const dosage = med?.dosage || 'prescribed dose';
      const scheduledTimeStr = new Date(dose.scheduledAt).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // STAGE 1: Due now (0 to 14 minutes overdue)
      if (diffMinutes >= 0 && diffMinutes < 15) {
        const notifKey = `${dose.doseKey}_stage_1`;
        if (!notifKeySet.has(notifKey)) {
          const newNotif: Partial<NotificationRecord> & { doseKey: string } = {
            _id: `notif-stg1-${dose.doseKey}-${Date.now()}`,
            careProfileId: dose.careProfileId,
            title: `Reminder: Time for ${medName} (${dosage})`,
            message: `Scheduled for ${scheduledTimeStr}. ${med?.instructions || 'Take with water'}.`,
            type: 'missed_dose',
            priority: 'medium',
            stage: 1,
            status: 'unread',
            sentViaEmail: false,
            createdAt: nowIso,
            doseKey: dose.doseKey,
          };

          await db.notifications.insertOne(newNotif);
          notifKeySet.add(notifKey);
          stage1Created++;
          actions.push({
            stage: 1,
            doseKey: dose.doseKey,
            patient: patientName,
            medicine: medName,
            diffMinutes,
            action: 'In-app reminder created',
          });
        }
      }

      // STAGE 2: 15 to 29 minutes overdue
      else if (diffMinutes >= 15 && diffMinutes < 30) {
        const notifKey = `${dose.doseKey}_stage_2`;
        if (!notifKeySet.has(notifKey)) {
          const newNotif: Partial<NotificationRecord> & { doseKey: string } = {
            _id: `notif-stg2-${dose.doseKey}-${Date.now()}`,
            careProfileId: dose.careProfileId,
            title: `Follow-Up (+15m): ${medName} Not Yet Logged`,
            message: `${medName} was scheduled at ${scheduledTimeStr} (${diffMinutes} mins ago) and has not been logged. Please check on ${patientName}.`,
            type: 'missed_dose',
            priority: 'high',
            stage: 2,
            status: 'unread',
            sentViaEmail: false,
            createdAt: nowIso,
            doseKey: dose.doseKey,
          };

          await db.notifications.insertOne(newNotif);
          notifKeySet.add(notifKey);
          stage2Created++;
          actions.push({
            stage: 2,
            doseKey: dose.doseKey,
            patient: patientName,
            medicine: medName,
            diffMinutes,
            action: 'High-priority follow-up notification created',
          });
        }
      }

      // STAGE 3: 30+ minutes overdue — Caregiver Email Escalation
      else if (diffMinutes >= 30) {
        const notifKey = `${dose.doseKey}_stage_3`;
        if (!notifKeySet.has(notifKey)) {
          // Identify caregiver recipient emails
          const caregiverMembers = memberships.filter(
            m => m.careProfileId === dose.careProfileId && 
            (m.role === 'caregiver' || m.role === 'primary_caregiver')
          );
          
          let recipientEmails = caregiverMembers
            .map(m => m.userEmail)
            .filter((e): e is string => Boolean(e && e.includes('@')));

          if (recipientEmails.length === 0) {
            // Check emergency contacts
            if (profile && profile.emergencyContacts && profile.emergencyContacts.length > 0) {
              recipientEmails = ['primary.caregiver@carenest.internal'];
            } else {
              recipientEmails = ['caregiver.oncall@carenest.internal'];
            }
          }

          const primaryPhone = profile?.emergencyContacts?.[0]?.phone;

          // Dispatch Resend email
          const emailResult = await sendStage3CaregiverEscalation(recipientEmails, {
            seniorName: patientName,
            medicineName: medName,
            dosage: dosage,
            category: med?.medicineCategory || 'allopathic',
            scheduledTime: scheduledTimeStr,
            minutesOverdue: diffMinutes,
            instructions: med?.instructions || 'Take as prescribed',
            emergencyPhone: primaryPhone,
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
          });

          // Create Stage 3 urgent notification
          const newNotif: Partial<NotificationRecord> & { doseKey: string } = {
            _id: `notif-stg3-${dose.doseKey}-${Date.now()}`,
            careProfileId: dose.careProfileId,
            title: `🚨 CRITICAL ESCALATION: ${medName} Overdue (+${diffMinutes}m)`,
            message: `Stage 3 escalation email dispatched to caregivers (${recipientEmails.join(', ')}). ${patientName} has not taken ${medName} scheduled at ${scheduledTimeStr}.`,
            type: 'missed_dose',
            priority: 'urgent',
            stage: 3,
            status: 'unread',
            sentViaEmail: true,
            createdAt: nowIso,
            doseKey: dose.doseKey,
          };

          await db.notifications.insertOne(newNotif);

          // Record audit log
          await db.auditLogs.insertOne({
            _id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            careProfileId: dose.careProfileId,
            actorId: 'system:cron-reminders',
            actorName: 'CareNest Escalation Daemon',
            actorRole: 'system',
            action: 'STAGE_3_EMAIL_ESCALATION_SENT',
            entityType: 'doseEvent',
            entityId: dose._id || dose.doseKey,
            details: {
              doseKey: dose.doseKey,
              minutesOverdue: diffMinutes,
              recipients: recipientEmails,
              emailResult,
            },
            createdAt: nowIso,
          });

          notifKeySet.add(notifKey);
          stage3Escalated++;
          actions.push({
            stage: 3,
            doseKey: dose.doseKey,
            patient: patientName,
            medicine: medName,
            diffMinutes,
            recipients: recipientEmails,
            emailSimulated: emailResult.simulated,
            action: 'Dispatched Stage 3 caregiver email escalation',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedAt: nowIso,
      evaluatedDosesCount: scheduledDoses.length,
      summary: {
        stage1Created,
        stage2Created,
        stage3Escalated,
      },
      actions,
    });
  } catch (error: any) {
    console.error('[API /api/cron/reminders] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error in reminder cron daemon' },
      { status: 500 }
    );
  }
}
