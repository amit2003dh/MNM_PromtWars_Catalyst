import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership, canManageMedications } from '@/lib/auth';
import { 
  getMedicationsCollection, 
  getNotificationsCollection, 
  logAudit, 
  SEED_IDS 
} from '@/lib/db';
import { MedicationCreateSchema } from '@/lib/validations';
import { Medication, NotificationRecord } from '@/types';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId') || SEED_IDS.PROFILE_MEERA;
    const status = searchParams.get('status');

    if (user && careProfileId !== SEED_IDS.PROFILE_MEERA) {
      const { isMember } = await verifyMembership(user._id, careProfileId);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: Access denied to this care profile' }, { status: 403 });
      }
    }

    const query: Record<string, any> = { careProfileId };
    if (status) {
      query.status = status;
    }

    const medicationsCol = await getMedicationsCollection();
    const medications = await medicationsCol.find(query).toArray();

    return NextResponse.json({ medications });
  } catch (err: any) {
    console.error('[API Medications GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const result = MedicationCreateSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;
    const { isMember, role } = await verifyMembership(user._id, data.careProfileId);

    // Permission check: RBAC matrix restricts adding meds to caregivers / primary caregivers
    if (data.careProfileId !== SEED_IDS.PROFILE_MEERA && !isMember) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this care circle' }, { status: 403 });
    }

    const effectiveRole = role || user.role;
    if (!canManageMedications(effectiveRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only caregivers and primary caregivers can prescribe or add medications' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const medId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newMedication: Medication = {
      _id: medId,
      careProfileId: data.careProfileId,
      medicineName: data.medicineName,
      medicineCategory: data.medicineCategory,
      dosage: data.dosage,
      instructions: data.instructions,
      frequency: data.frequency,
      scheduledTimes: data.scheduledTimes,
      mealRelation: data.mealRelation,
      pillColor: data.pillColor,
      pillShape: data.pillShape,
      imageUrl: data.imageUrl,
      totalQuantity: data.totalQuantity,
      remainingQuantity: data.remainingQuantity,
      refillThreshold: data.refillThreshold,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || 'active',
      reconciliationStatus: data.reconciliationStatus || 'CONTINUE',
      reconciliationNotes: data.reconciliationNotes,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    };

    const medicationsCol = await getMedicationsCollection();
    await medicationsCol.insertOne(newMedication);

    // Automatic refill alert if quantity is already at or below threshold
    if (newMedication.remainingQuantity <= newMedication.refillThreshold) {
      const notifsCol = await getNotificationsCollection();
      const refillNotif: NotificationRecord = {
        _id: `notif_${Date.now()}_refill`,
        careProfileId: data.careProfileId,
        title: `Low Inventory Alert: ${newMedication.medicineName}`,
        message: `${newMedication.medicineName} has only ${newMedication.remainingQuantity} units remaining (Threshold: ${newMedication.refillThreshold}). Please arrange a refill.`,
        type: 'refill',
        priority: 'high',
        status: 'unread',
        sentViaEmail: false,
        createdAt: now,
      };
      await notifsCol.insertOne(refillNotif);
    }

    await logAudit({
      careProfileId: data.careProfileId,
      actorId: user._id,
      actorName: user.name,
      actorRole: effectiveRole,
      action: 'ADD_MEDICATION',
      entityType: 'medication',
      entityId: medId,
      details: {
        medicineName: data.medicineName,
        dosage: data.dosage,
        totalQuantity: data.totalQuantity,
      },
    });

    return NextResponse.json({ success: true, medication: newMedication }, { status: 201 });
  } catch (err: any) {
    console.error('[API Medications POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
