import { NextResponse } from 'next/server';
import { authenticateRequest, canAdministerDose } from '@/lib/auth';
import { 
  getDoseEventsCollection, 
  getMedicationsCollection, 
  getNotificationsCollection, 
  getCareProfilesCollection,
  logAudit 
} from '@/lib/db';
import { AdministerDoseSchema } from '@/lib/validations';
import { DoseEvent, Medication, NotificationRecord } from '@/types';

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized: Authentication required' }, { status: auth.statusCode || 401 });
    }

    const json = await request.json();
    const result = AdministerDoseSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Verify care profile belongs to this household
    const profilesCol = await getCareProfilesCollection();
    let profile = null;
    if (data.careProfileId) {
      profile = await profilesCol.findOne({ _id: data.careProfileId, householdId: auth.householdId });
      if (!profile) {
        return NextResponse.json({ error: 'Forbidden: Access denied to this care circle' }, { status: 403 });
      }
    } else {
      profile = await profilesCol.findOne({ householdId: auth.householdId });
      if (!profile) {
        return NextResponse.json({ error: 'Forbidden: No active care profile in this household' }, { status: 403 });
      }
      data.careProfileId = profile._id;
    }

    // Role-based check
    if (!canAdministerDose(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Your role does not permit administering doses.' },
        { status: 403 }
      );
    }

    const doseEventsCol = await getDoseEventsCollection();
    const medicationsCol = await getMedicationsCollection();

    // 1. Anti-Double-Dosing Verification on doseKey
    const existingDose = await doseEventsCol.findOne({ 
      doseKey: data.doseKey,
      householdId: auth.householdId,
    });

    if (existingDose && existingDose.status === 'taken') {
      return NextResponse.json(
        {
          error: 'Safety Alert: Dose has already been administered!',
          alreadyAdministered: true,
          doseKey: data.doseKey,
          administeredBy: existingDose.administeredBy,
          administeredByName: existingDose.administeredByName,
          recordedAt: existingDose.recordedAt,
          notes: existingDose.notes,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const statusToSet = data.status || 'taken';

    // 2. Concurrency-Safe Atomic Update with household scoping
    let updatedEvent: DoseEvent | null = null;

    try {
      const atomicResult = await doseEventsCol.findOneAndUpdate(
        { 
          doseKey: data.doseKey, 
          householdId: auth.householdId,
          status: { $ne: 'taken' } 
        },
        {
          $set: {
            status: statusToSet,
            administeredBy: auth.user._id,
            administeredByName: auth.user.name,
            recordedAt: now,
            notes: data.notes || '',
          },
        },
        { returnDocument: 'after' }
      );

      if (atomicResult) {
        updatedEvent = atomicResult as DoseEvent;
      }
    } catch {
      // Fallback
    }

    // 3. If no existing scheduled document was modified, insert a fresh event
    if (!updatedEvent) {
      const newDoseEvent: DoseEvent = {
        _id: `dose_event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        householdId: auth.householdId,
        careProfileId: data.careProfileId,
        medicationId: data.medicationId,
        doseKey: data.doseKey,
        scheduledAt: data.scheduledAt || now,
        status: statusToSet,
        administeredBy: auth.user._id,
        administeredByName: auth.user.name,
        recordedAt: now,
        notes: data.notes || '',
      };

      try {
        await doseEventsCol.insertOne(newDoseEvent);
        updatedEvent = newDoseEvent;
      } catch (insertErr: any) {
        // Duplicate key collision (Mongo code 11000 or duplicate key)
        if (insertErr.code === 11000 || insertErr.message?.includes('duplicate key') || insertErr.message?.includes('E11000')) {
          const conflictingEvent = await doseEventsCol.findOne({ doseKey: data.doseKey });
          return NextResponse.json(
            {
              error: 'Safety Alert: Concurrent dose administration blocked! This dose was just marked by another user.',
              alreadyAdministered: true,
              doseKey: data.doseKey,
              administeredBy: conflictingEvent?.administeredBy,
              administeredByName: conflictingEvent?.administeredByName || 'Another Caregiver',
              recordedAt: conflictingEvent?.recordedAt || now,
              notes: conflictingEvent?.notes,
            },
            { status: 409 }
          );
        }
        throw insertErr;
      }
    }

    // 4. Atomically Decrement Medication Inventory
    let medAfterUpdate: Medication | null = null;
    if (statusToSet === 'taken') {
      try {
        await medicationsCol.updateOne(
          { _id: data.medicationId, householdId: auth.householdId, remainingQuantity: { $gt: 0 } },
          { $inc: { remainingQuantity: -1 }, $set: { updatedAt: now } }
        );
        medAfterUpdate = await medicationsCol.findOne({ _id: data.medicationId, householdId: auth.householdId });
      } catch (medErr) {
        console.warn('[API Dose Administer] Inventory decrement notice:', medErr);
      }
    }

    // 5. Automatic Low-Inventory Escalation Alert
    if (
      medAfterUpdate &&
      medAfterUpdate.remainingQuantity !== undefined &&
      medAfterUpdate.refillThreshold !== undefined &&
      medAfterUpdate.remainingQuantity <= medAfterUpdate.refillThreshold
    ) {
      const notifsCol = await getNotificationsCollection();
      const existingRefillAlert = await notifsCol.findOne({
        householdId: auth.householdId,
        careProfileId: data.careProfileId,
        type: 'refill',
        status: 'unread',
        title: { $regex: medAfterUpdate.medicineName },
      });

      if (!existingRefillAlert) {
        const refillAlert: NotificationRecord = {
          _id: `notif_${Date.now()}_refill`,
          householdId: auth.householdId,
          careProfileId: data.careProfileId,
          title: `Low Stock Alert: ${medAfterUpdate.medicineName}`,
          message: `${medAfterUpdate.medicineName} has only ${medAfterUpdate.remainingQuantity} units remaining (Threshold: ${medAfterUpdate.refillThreshold}). Please reorder soon.`,
          type: 'refill',
          priority: 'high',
          status: 'unread',
          sentViaEmail: false,
          createdAt: now,
        };
        await notifsCol.insertOne(refillAlert);
      }
    }

    // 6. Record Tamper-Evident Audit Log
    await logAudit({
      householdId: auth.householdId,
      careProfileId: data.careProfileId,
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'OWNER',
      action: 'ADMINISTER_DOSE',
      entityType: 'doseEvent',
      entityId: updatedEvent._id,
      details: {
        doseKey: data.doseKey,
        medicationId: data.medicationId,
        status: statusToSet,
        remainingQuantity: medAfterUpdate?.remainingQuantity,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Dose marked as taken successfully',
      doseEvent: updatedEvent,
      remainingQuantity: medAfterUpdate?.remainingQuantity,
    });
  } catch (err: any) {
    console.error('[API Dose Administer] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
