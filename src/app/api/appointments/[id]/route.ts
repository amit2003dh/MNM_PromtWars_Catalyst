import { NextResponse } from 'next/server';
import { authenticateRequest, canManageAppointments } from '@/lib/auth';
import { getAppointmentsCollection, logAudit } from '@/lib/db';
import { AppointmentUpdateSchema } from '@/lib/validations';
import { Appointment } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const { id } = await context.params;
    const apptsCol = await getAppointmentsCollection();
    const appt = await apptsCol.findOne({ _id: id });

    if (!appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Strict multi-tenant IDOR protection
    if (appt.householdId && appt.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    return NextResponse.json({ appointment: appt });
  } catch (err: any) {
    console.error('[API Appointment GET by ID] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    if (!canManageAppointments(auth.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to update appointments' }, { status: 403 });
    }

    const { id } = await context.params;
    const apptsCol = await getAppointmentsCollection();
    const existing: Appointment | null = await apptsCol.findOne({ _id: id });
    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // IDOR Protection: verify household
    if (existing.householdId && existing.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    const json = await request.json();
    const result = AppointmentUpdateSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation error', details: result.error.flatten() }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updates = {
      ...result.data,
      updatedAt: now,
    };

    await apptsCol.updateOne({ _id: id }, { $set: updates });
    const updated = await apptsCol.findOne({ _id: id });

    await logAudit({
      householdId: auth.householdId,
      careProfileId: existing.careProfileId,
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'OWNER',
      action: 'UPDATE_APPOINTMENT',
      entityType: 'appointment',
      entityId: id,
      details: result.data,
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (err: any) {
    console.error('[API Appointment PUT] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    if (!canManageAppointments(auth.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to delete appointments' }, { status: 403 });
    }

    const { id } = await context.params;
    const apptsCol = await getAppointmentsCollection();
    const existing: Appointment | null = await apptsCol.findOne({ _id: id });
    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // IDOR Protection: verify household
    if (existing.householdId && existing.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    await apptsCol.deleteOne({ _id: id });

    await logAudit({
      householdId: auth.householdId,
      careProfileId: existing.careProfileId,
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'OWNER',
      action: 'CANCEL_APPOINTMENT',
      entityType: 'appointment',
      entityId: id,
      details: { doctorName: existing.doctorName },
    });

    return NextResponse.json({ success: true, message: 'Appointment removed' });
  } catch (err: any) {
    console.error('[API Appointment DELETE] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
