import { NextResponse } from 'next/server';
import { authenticateRequest, canReportSymptoms } from '@/lib/auth';
import { 
  getHealthLogsCollection, 
  getNotificationsCollection, 
  getCareProfilesCollection,
  logAudit 
} from '@/lib/db';
import { HealthLogCreateSchema } from '@/lib/validations';
import { HealthLog, NotificationRecord } from '@/types';

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId');
    const symptom = searchParams.get('symptom');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query: Record<string, any> = { householdId: auth.householdId };
    
    if (careProfileId) {
      const profilesCol = await getCareProfilesCollection();
      const profile = await profilesCol.findOne({ _id: careProfileId, householdId: auth.householdId });
      if (!profile) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
      query.careProfileId = careProfileId;
    }

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
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized: Authentication required' }, { status: auth.statusCode || 401 });
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

    // Verify profile belongs to this household
    const profilesCol = await getCareProfilesCollection();
    let profile = await profilesCol.findOne({ _id: data.careProfileId, householdId: auth.householdId });
    if (!profile) {
      profile = await profilesCol.findOne({ householdId: auth.householdId });
      if (profile) {
        data.careProfileId = profile._id;
      } else {
        return NextResponse.json({ error: 'Forbidden: Invalid care profile for this household' }, { status: 403 });
      }
    }

    if (!canReportSymptoms(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Your role does not have permission to log health symptoms' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const logId = `hl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newLog: HealthLog = {
      _id: logId,
      householdId: auth.householdId,
      careProfileId: data.careProfileId || profile._id,
      entryType: data.entryType || (data.mood ? 'mood' : 'symptom'),
      symptom: data.symptom,
      severity: data.severity,
      mood: data.mood,
      moodNotes: data.moodNotes,
      vitals: data.vitals,
      notes: data.notes,
      reportedBy: auth.user._id,
      reportedByName: auth.user.name,
      reportedAt: now,
    };

    const healthLogsCol = await getHealthLogsCollection();
    await healthLogsCol.insertOne(newLog);

    // Auto-create high-priority circle notification for concerning symptoms or low mood
    if (['dizziness', 'weakness', 'confusion', 'stomach_discomfort'].includes(data.symptom) || data.mood === 'unwell') {
      const notifsCol = await getNotificationsCollection();
      const alertNotif: NotificationRecord = {
        _id: `notif_${Date.now()}_symptom`,
        householdId: auth.householdId,
        careProfileId: newLog.careProfileId,
        title: data.mood === 'unwell' 
          ? `Mood Check-In Alert: Low wellbeing reported by ${auth.user.name}`
          : `Health Alert: ${data.symptom.replace('_', ' ').toUpperCase()} reported by ${auth.user.name}`,
        message: data.mood === 'unwell'
          ? `Note: ${data.moodNotes || data.notes || 'Feeling unwell'}. Please check in.`
          : `Severity: ${data.severity.toUpperCase()}. Notes: ${data.notes || 'None specified'}. Care circle notified.`,
        type: 'symptom_alert',
        priority: data.severity === 'severe' || data.mood === 'unwell' ? 'urgent' : 'high',
        status: 'unread',
        sentViaEmail: false,
        createdAt: now,
      };
      await notifsCol.insertOne(alertNotif);
    }

    await logAudit({
      householdId: auth.householdId,
      careProfileId: newLog.careProfileId,
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'OWNER',
      action: data.mood ? 'LOG_MOOD' : 'LOG_SYMPTOM',
      entityType: 'healthLog',
      entityId: logId,
      details: {
        entryType: newLog.entryType,
        symptom: data.symptom,
        severity: data.severity,
        mood: data.mood,
      },
    });

    return NextResponse.json({ success: true, log: newLog }, { status: 201 });
  } catch (err: any) {
    console.error('[API HealthLogs POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
