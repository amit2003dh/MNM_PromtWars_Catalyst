import { NextResponse } from 'next/server';
import { authenticateRequest, canManageMedications } from '@/lib/auth';
import { 
  getMedicationsCollection, 
  getNotificationsCollection, 
  getCareProfilesCollection,
  logAudit 
} from '@/lib/db';
import { MedicationCreateSchema } from '@/lib/validations';
import { Medication, NotificationRecord } from '@/types';

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId');
    const status = searchParams.get('status');

    // Strict multi-tenant query: MUST contain householdId
    const query: Record<string, any> = { householdId: auth.householdId };
    
    if (careProfileId) {
      // Validate that requested careProfile belongs to this user's household
      const profilesCol = await getCareProfilesCollection();
      const profile = await profilesCol.findOne({ _id: careProfileId, householdId: auth.householdId });
      if (!profile) {
        return NextResponse.json({ error: 'Forbidden: Access denied to this care profile' }, { status: 403 });
      }
      query.careProfileId = careProfileId;
    }

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
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    // Role-based authorization
    if (!canManageMedications(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only owners, family coordinators, and caregivers can prescribe or add medications' },
        { status: 403 }
      );
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

    // Verify careProfileId belongs to this user's household
    const profilesCol = await getCareProfilesCollection();
    let profile = await profilesCol.findOne({ _id: data.careProfileId, householdId: auth.householdId });
    
    if (!profile) {
      // Fallback: check if household has another profile or create/link
      const userProfile = await profilesCol.findOne({ householdId: auth.householdId });
      if (userProfile) {
        data.careProfileId = userProfile._id;
        profile = userProfile;
      } else {
        return NextResponse.json({ error: 'Forbidden: Invalid care profile for this household' }, { status: 403 });
      }
    }

    const now = new Date().toISOString();
    const medId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newMedication: Medication = {
      _id: medId,
      householdId: auth.householdId,
      careProfileId: data.careProfileId || profile._id,
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
      startDate: data.startDate || now.split('T')[0],
      endDate: data.endDate,
      status: data.status || 'active',
      reconciliationStatus: data.reconciliationStatus || 'CONTINUE',
      reconciliationNotes: data.reconciliationNotes,
      createdBy: auth.user._id,
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
        householdId: auth.householdId,
        careProfileId: newMedication.careProfileId,
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
      householdId: auth.householdId,
      careProfileId: newMedication.careProfileId,
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'OWNER',
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
