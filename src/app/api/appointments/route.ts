import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership, canManageAppointments } from '@/lib/auth';
import { 
  getAppointmentsCollection, 
  getNotificationsCollection, 
  logAudit, 
  SEED_IDS 
} from '@/lib/db';
import { AppointmentCreateSchema } from '@/lib/validations';
import { Appointment, NotificationRecord } from '@/types';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId') || SEED_IDS.PROFILE_MEERA;
    const status = searchParams.get('status');

    if (user && careProfileId !== SEED_IDS.PROFILE_MEERA) {
      const { isMember } = await verifyMembership(user._id, careProfileId);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
    }

    const query: Record<string, any> = { careProfileId };
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
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
    const { isMember, role } = await verifyMembership(user._id, data.careProfileId);

    if (data.careProfileId !== SEED_IDS.PROFILE_MEERA && !isMember) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this care circle' }, { status: 403 });
    }

    const effectiveRole = role || user.role;
    if (!canManageAppointments(effectiveRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Seniors have read-only access to doctor appointments' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const apptId = `appt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newAppointment: Appointment = {
      _id: apptId,
      careProfileId: data.careProfileId,
      doctorName: data.doctorName,
      specialty: data.specialty,
      dateTime: data.dateTime,
      location: data.location,
      notes: data.notes,
      status: data.status || 'scheduled',
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    };

    const apptsCol = await getAppointmentsCollection();
    await apptsCol.insertOne(newAppointment);

    // Auto-create notification for the care circle
    const notifsCol = await getNotificationsCollection();
    const apptNotif: NotificationRecord = {
      _id: `notif_${Date.now()}_appt`,
      careProfileId: data.careProfileId,
      title: `Upcoming Appointment: ${data.doctorName} (${data.specialty})`,
      message: `Scheduled for ${new Date(data.dateTime).toLocaleString()} at ${data.location}.`,
      type: 'appointment',
      priority: 'medium',
      status: 'unread',
      sentViaEmail: false,
      createdAt: now,
    };
    await notifsCol.insertOne(apptNotif);

    await logAudit({
      careProfileId: data.careProfileId,
      actorId: user._id,
      actorName: user.name,
      actorRole: effectiveRole,
      action: 'SCHEDULE_APPOINTMENT',
      entityType: 'appointment',
      entityId: apptId,
      details: {
        doctorName: data.doctorName,
        specialty: data.specialty,
        dateTime: data.dateTime,
      },
    });

    return NextResponse.json({ success: true, appointment: newAppointment }, { status: 201 });
  } catch (err: any) {
    console.error('[API Appointments POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
