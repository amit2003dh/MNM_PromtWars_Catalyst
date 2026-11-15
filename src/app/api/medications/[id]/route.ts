import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership, canManageMedications } from '@/lib/auth';
import { 
  getMedicationsCollection, 
  getNotificationsCollection, 
  logAudit, 
  SEED_IDS 
} from '@/lib/db';
import { MedicationUpdateSchema } from '@/lib/validations';
import { Medication, NotificationRecord } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser(request);
    const medicationsCol = await getMedicationsCollection();
    const medication = await medicationsCol.findOne({ _id: id });

    if (!medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    if (user && medication.careProfileId !== SEED_IDS.PROFILE_MEERA) {
      const { isMember } = await verifyMembership(user._id, medication.careProfileId);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ medication });
  } catch (err: any) {
    console.error('[API Medication GET by ID] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const medicationsCol = await getMedicationsCollection();
    const existing = await medicationsCol.findOne({ _id: id });
    if (!existing) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    const { isMember, role } = await verifyMembership(user._id, existing.careProfileId);
    if (existing.careProfileId !== SEED_IDS.PROFILE_MEERA && !isMember) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    const effectiveRole = role || user.role;
    if (!canManageMedications(effectiveRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only caregivers and primary caregivers can modify medications' },
        { status: 403 }
      );
    }

    const json = await request.json();
    const result = MedicationUpdateSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation error', details: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;
    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      ...data,
      updatedAt: now,
    };

    await medicationsCol.updateOne({ _id: id }, { $set: updates });
    const updated: Medication = await medicationsCol.findOne({ _id: id });

    // Refill threshold check
    if (
      updated.remainingQuantity !== undefined &&
      updated.refillThreshold !== undefined &&
      updated.remainingQuantity <= updated.refillThreshold
    ) {
      const notifsCol = await getNotificationsCollection();
      const existingRefillNotif = await notifsCol.findOne({
        careProfileId: updated.careProfileId,
        type: 'refill',
        status: 'unread',
        title: { $regex: updated.medicineName },
      });

      if (!existingRefillNotif) {
        const refillNotif: NotificationRecord = {
          _id: `notif_${Date.now()}_refill`,
          careProfileId: updated.careProfileId,
          title: `Low Inventory Alert: ${updated.medicineName}`,
          message: `${updated.medicineName} has only ${updated.remainingQuantity} units remaining (Threshold: ${updated.refillThreshold}). Please arrange a refill.`,
          type: 'refill',
          priority: 'high',
          status: 'unread',
          sentViaEmail: false,
          createdAt: now,
        };
        await notifsCol.insertOne(refillNotif);
      }
    }

    await logAudit({
      careProfileId: existing.careProfileId,
      actorId: user._id,
      actorName: user.name,
      actorRole: effectiveRole,
      action: 'UPDATE_MEDICATION',
      entityType: 'medication',
      entityId: id,
      details: data,
    });

    return NextResponse.json({ success: true, medication: updated });
  } catch (err: any) {
    console.error('[API Medication PUT] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const medicationsCol = await getMedicationsCollection();
    const existing = await medicationsCol.findOne({ _id: id });
    if (!existing) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    const { isMember, role } = await verifyMembership(user._id, existing.careProfileId);
    if (existing.careProfileId !== SEED_IDS.PROFILE_MEERA && !isMember) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    const effectiveRole = role || user.role;
    if (!canManageMedications(effectiveRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only caregivers and primary caregivers can discontinue medications' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    // Soft-delete: mark as discontinued
    await medicationsCol.updateOne(
      { _id: id },
      { $set: { status: 'discontinued', updatedAt: now } }
    );

    await logAudit({
      careProfileId: existing.careProfileId,
      actorId: user._id,
      actorName: user.name,
      actorRole: effectiveRole,
      action: 'DISCONTINUE_MEDICATION',
      entityType: 'medication',
      entityId: id,
      details: { medicineName: existing.medicineName },
    });

    return NextResponse.json({ success: true, message: `Medication '${existing.medicineName}' discontinued` });
  } catch (err: any) {
    console.error('[API Medication DELETE] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
