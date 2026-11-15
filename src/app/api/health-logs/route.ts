import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership, canReportSymptoms } from '@/lib/auth';
import { 
  getHealthLogsCollection, 
  getNotificationsCollection, 
  logAudit, 
  SEED_IDS 
} from '@/lib/db';
import { HealthLogCreateSchema } from '@/lib/validations';
import { HealthLog, NotificationRecord } from '@/types';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId') || SEED_IDS.PROFILE_MEERA;
    const symptom = searchParams.get('symptom');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (user && careProfileId !== SEED_IDS.PROFILE_MEERA) {
      const { isMember } = await verifyMembership(user._id, careProfileId);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
    }

    const query: Record<string, any> = { careProfileId };
    if (symptom) query.symptom = symptom;

    const healthLogsCol = await getHealthLogsCollection();
    const logs = await healthLogsCol.find(query).sort({ reportedAt: -1 }).limit(limit).toArray();

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error('[API HealthLogs GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const json = await request.json();
    const result = HealthLogCreateSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;
    const { isMember, role } = await verifyMembership(user._id, data.careProfileId);

    if (data.careProfileId !== SEED_IDS.PROFILE_MEERA && !isMember) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this care circle' }, { status: 403 });
    }

    const effectiveRole = role || user.role;
    if (!canReportSymptoms(effectiveRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only seniors and caregivers may log symptoms' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const logId = `health_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newLog: HealthLog = {
      _id: logId,
      careProfileId: data.careProfileId,
      symptom: data.symptom,
      severity: data.severity,
      notes: data.notes,
      reportedBy: user._id,
      reportedByName: `${user.name} (${effectiveRole})`,
      reportedAt: now,
    };

    const healthLogsCol = await getHealthLogsCollection();
    await healthLogsCol.insertOne(newLog);

    // Auto-create escalation alert notification for moderate/severe symptoms or red-flag symptoms
    const isEscalationCandidate = data.severity === 'severe' || 
      (data.severity === 'moderate' && ['dizziness', 'confusion', 'weakness'].includes(data.symptom));

    if (isEscalationCandidate) {
      const notifsCol = await getNotificationsCollection();
      const symptomAlert: NotificationRecord = {
        _id: `notif_${Date.now()}_symptom`,
        careProfileId: data.careProfileId,
        title: `Symptom Alert: ${data.severity.toUpperCase()} ${data.symptom.replace('_', ' ')}`,
        message: `${user.name} logged ${data.severity} ${data.symptom}. Notes: ${data.notes || 'None'}. Please monitor closely.`,
        type: 'symptom_alert',
        priority: data.severity === 'severe' ? 'urgent' : 'high',
        status: 'unread',
        sentViaEmail: false,
        createdAt: now,
      };
      await notifsCol.insertOne(symptomAlert);
    }

    await logAudit({
      careProfileId: data.careProfileId,
      actorId: user._id,
      actorName: user.name,
      actorRole: effectiveRole,
      action: 'LOG_HEALTH_SYMPTOM',
      entityType: 'healthLog',
      entityId: logId,
      details: {
        symptom: data.symptom,
        severity: data.severity,
        notes: data.notes,
      },
    });

    return NextResponse.json({ success: true, log: newLog }, { status: 201 });
  } catch (err: any) {
    console.error('[API HealthLogs POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
