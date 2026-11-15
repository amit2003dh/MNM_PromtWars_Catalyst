import { NextResponse } from 'next/server';
import { authenticateRequest, canManageAppointments } from '@/lib/auth';
import { 
  getAppointmentsCollection, 
  getNotificationsCollection, 
  getCareProfilesCollection,
  logAudit 
} from '@/lib/db';
import { AppointmentCreateSchema } from '@/lib/validations';
import { Appointment, NotificationRecord } from '@/types';

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId');
    const status = searchParams.get('status');

    const query: Record<string, any> = { householdId: auth.householdId };
    
    if (careProfileId) {
      const profilesCol = await getCareProfilesCollection();
      const profile = await profilesCol.findOne({ _id: careProfileId, householdId: auth.householdId });
      if (!profile) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
      query.careProfileId = careProfileId;
    }

    if (status) query.status = status;

    const apptsCol = await getAppointmentsCollection();
    const appointments = await apptsCol.find(query).sort({ dateTime: 1 }).toArray();

    return NextResponse.json({ appointments });
  } catch (err: any) {
    console.error('[API Appointments GET] Error:', err);
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
    const result = AppointmentCreateSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Verify care profile belongs to household
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

    if (!canManageAppointments(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Your role does not permit scheduling appointments' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const apptId = `appt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newAppointment: Appointment = {
      _id: apptId,
      householdId: auth.householdId,
      careProfileId: data.careProfileId,
      doctorName: data.doctorName,
      specialty: data.specialty,
      dateTime: data.dateTime,
      location: data.location,
      notes: data.notes,
      status: data.status || 'scheduled',
      createdBy: auth.user._id,
      createdAt: now,
      updatedAt: now,
    };

    const apptsCol = await getAppointmentsCollection();
    await apptsCol.insertOne(newAppointment);

    // Circle Notification
    const notifsCol = await getNotificationsCollection();
    const apptNotif: NotificationRecord = {
      _id: `notif_${Date.now()}_appt`,
      householdId: auth.householdId,
      careProfileId: data.careProfileId,
      title: `New Appointment Scheduled: ${newAppointment.doctorName}`,
      message: `${newAppointment.specialty} visit on ${new Date(newAppointment.dateTime).toLocaleDateString()} at ${newAppointment.location}.`,
      type: 'appointment',
      priority: 'medium',
      status: 'unread',
      sentViaEmail: false,
      createdAt: now,
    };
    await notifsCol.insertOne(apptNotif);

    await logAudit({
      householdId: auth.householdId,
      careProfileId: data.careProfileId,
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'OWNER',
      action: 'SCHEDULE_APPOINTMENT',
      entityType: 'appointment',
      entityId: apptId,
      details: {
        doctorName: data.doctorName,
        dateTime: data.dateTime,
      },
    });

    return NextResponse.json({ success: true, appointment: newAppointment }, { status: 201 });
  } catch (err: any) {
    console.error('[API Appointments POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
