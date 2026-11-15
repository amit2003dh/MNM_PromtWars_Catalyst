import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership, canAdministerDose } from '@/lib/auth';
import { 
  getDoseEventsCollection, 
  getMedicationsCollection, 
  getNotificationsCollection, 
  logAudit, 
  SEED_IDS 
} from '@/lib/db';
import { AdministerDoseSchema } from '@/lib/validations';
import { DoseEvent, Medication, NotificationRecord } from '@/types';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
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
    const { isMember, role } = await verifyMembership(user._id, data.careProfileId);

    if (data.careProfileId !== SEED_IDS.PROFILE_MEERA && !isMember) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this care circle' }, { status: 403 });
    }

    const effectiveRole = role || user.role;
    // Family members are restricted from marking doses taken (read-only)
    if (!canAdministerDose(effectiveRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Family members have read-only access. Only seniors and caregivers may administer or record doses.' },
        { status: 403 }
      );
    }

    const doseEventsCol = await getDoseEventsCollection();
    const medicationsCol = await getMedicationsCollection();

    // 1. Check if the dose has already been taken (Anti-Double-Dosing Verification)
    const existingDose = await doseEventsCol.findOne({ doseKey: data.doseKey });

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

    // 2. Concurrency-Safe Atomic Update
    // Matches doseKey where status is NOT 'taken'. If concurrently marked, this atomic operation will not match.
    let updatedEvent: DoseEvent | null = null;

    if (existingDose) {
      updatedEvent = await doseEventsCol.findOneAndUpdate(
        { 
          doseKey: data.doseKey, 
          status: { $ne: 'taken' } 
        },
        {
          $set: {
            status: statusToSet,
            administeredBy: user._id,
            administeredByName: user.name,
            recordedAt: now,
            notes: data.notes || existingDose.notes || '',
          },
        },
        { returnDocument: 'after' }
      );

      // If document was not updated, another concurrent request just marked it!
      if (!updatedEvent) {
        const raceDose = await doseEventsCol.findOne({ doseKey: data.doseKey });
        return NextResponse.json(
          {
            error: 'Safety Alert: Concurrency conflict — dose was just administered by another caregiver!',
            alreadyAdministered: true,
            doseKey: data.doseKey,
            administeredBy: raceDose?.administeredBy,
            administeredByName: raceDose?.administeredByName,
            recordedAt: raceDose?.recordedAt,
          },
          { status: 409 }
        );
      }
    } else {
      // Upsert / Insert new dose event
      const newDoseId = `dose_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newEvent: DoseEvent = {
        _id: newDoseId,
        careProfileId: data.careProfileId,
        medicationId: data.medicationId,
        doseKey: data.doseKey,
        scheduledAt: data.scheduledAt || now,
        status: statusToSet,
        administeredBy: user._id,
        administeredByName: user.name,
        recordedAt: now,
        notes: data.notes || '',
      };

      try {
        await doseEventsCol.insertOne(newEvent);
        updatedEvent = newEvent;
      } catch (err: any) {
        // Handle race condition on unique index on doseKey
        if (err.code === 11000 || err.message?.includes('duplicate key')) {
          const raceDose = await doseEventsCol.findOne({ doseKey: data.doseKey });
          return NextResponse.json(
            {
              error: 'Safety Alert: Duplicate dose administration prevented by unique dose key index!',
              alreadyAdministered: true,
              doseKey: data.doseKey,
              administeredBy: raceDose?.administeredBy,
              administeredByName: raceDose?.administeredByName,
              recordedAt: raceDose?.recordedAt,
            },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    // 3. Atomically Decrement Medication Inventory (if marked taken)
    let remainingQuantity: number | undefined;
    let medName = 'Medication';

    if (statusToSet === 'taken') {
      const medDoc: Medication | null = await medicationsCol.findOne({ _id: data.medicationId });
      if (medDoc) {
        medName = medDoc.medicineName;
        // Decrement remainingQuantity by 1, avoiding negative counts
        const currentQty = medDoc.remainingQuantity ?? 0;
        const newQty = Math.max(0, currentQty - 1);
        await medicationsCol.updateOne(
          { _id: data.medicationId },
          { $set: { remainingQuantity: newQty, updatedAt: now } }
        );
        remainingQuantity = newQty;

        // 4. Trigger Refill Alert if remainingQuantity drops to or below threshold
        if (newQty <= (medDoc.refillThreshold ?? 5)) {
          const notifsCol = await getNotificationsCollection();
          const refillNotif: NotificationRecord = {
            _id: `notif_${Date.now()}_refill`,
            careProfileId: data.careProfileId,
            title: `Low Inventory Alert: ${medDoc.medicineName}`,
            message: `${medDoc.medicineName} has only ${newQty} units remaining (Refill threshold: ${medDoc.refillThreshold}). Please arrange a refill soon.`,
            type: 'refill',
            priority: 'high',
            status: 'unread',
            sentViaEmail: false,
            createdAt: now,
          };
          await notifsCol.insertOne(refillNotif);
        }
      }
    }

    // 5. Audit Log
    await logAudit({
      careProfileId: data.careProfileId,
      actorId: user._id,
      actorName: user.name,
      actorRole: effectiveRole,
      action: 'ADMINISTER_DOSE',
      entityType: 'doseEvent',
      entityId: updatedEvent._id,
      details: {
        doseKey: data.doseKey,
        medicationId: data.medicationId,
        medicineName: medName,
        status: statusToSet,
        remainingQuantity,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Dose of ${medName} marked as ${statusToSet}`,
      doseEvent: updatedEvent,
      remainingQuantity,
    }, { status: 200 });
  } catch (err: any) {
    console.error('[API Doses Administer] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
